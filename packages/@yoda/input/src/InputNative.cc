#include "InputNative.h"
#include <unistd.h>
#include <time.h>

#ifdef HAS_TOUCHPAD
#define IOTJS_INPUT_HAS_TOUCH true
#else
#define IOTJS_INPUT_HAS_TOUCH false
#endif

static JNativeInfoType this_module_native_info = {
  .free_cb = (jerry_object_native_free_callback_t)iotjs_input_destroy
};

class InputInitializer {
 public:
  InputInitializer() {
  }
  InputInitializer(iotjs_input_t* inputwrap_) {
    inputwrap = inputwrap_;
    initialized = false;
    req.data = this;
  }
  ~InputInitializer() {
  }

 public:
  int start(int timeout_select_, int timeout_dbclick_, int timeout_slide_) {
    timeout_select = timeout_select_;
    timeout_dbclick = timeout_dbclick_;
    timeout_slide = timeout_slide_;

    return uv_queue_work(uv_default_loop(), &req, InputInitializer::DoStart,
                         InputInitializer::AfterStart);
  }
  int stop() {
    return uv_cancel((uv_req_t*)&req);
  }

 public:
  static void DoStart(uv_work_t* req) {
    InputInitializer* initializer = (InputInitializer*)req->data;
    while (true) {
      fprintf(stdout, "config select(%dms) dbclick(%dms) slide(%dms)\n",
              initializer->timeout_select, initializer->timeout_dbclick,
              initializer->timeout_slide);
      bool r =
          init_input_key(IOTJS_INPUT_HAS_TOUCH, initializer->timeout_select,
                         initializer->timeout_dbclick,
                         initializer->timeout_slide);
      if (r)
        break;
      sleep(1);
    }
  }
  static void AfterStart(uv_work_t* req, int status) {
    InputInitializer* initializer = (InputInitializer*)req->data;
    iotjs_input_t* inputwrap = initializer->inputwrap;
    IOTJS_VALIDATED_STRUCT_METHOD(iotjs_input_t, inputwrap);

    if (status == 0 /* success */ &&
        _this->event_handler != NULL /* not canceled */) {
      _this->event_handler->start();
    } else {
      // iotjs_input_onerror(_this);
    }
  }

 public:
  bool initialized;

 private:
  iotjs_input_t* inputwrap;
  uv_work_t req;
  int timeout_select;
  int timeout_dbclick;
  int timeout_slide;
};

InputEventHandler::InputEventHandler() {
  // TODO
}

InputEventHandler::InputEventHandler(iotjs_input_t* inputwrap_) {
  inputwrap = inputwrap_;
  keyevent_ = { 0 };
  gesture_ = { 0 };
  need_destroy_ = false;
  req.data = this;
}

InputEventHandler::~InputEventHandler() {
  // TODO
}

int InputEventHandler::start() {
  event_handle.data = (void*)this;
  uv_async_init(uv_default_loop(), &event_handle, InputEventHandler::OnEvent);
  uv_mutex_init(&event_mutex);
  this->started = true;
  return uv_queue_work(uv_default_loop(), &req, InputEventHandler::DoStart,
                       InputEventHandler::AfterStart);
}

int InputEventHandler::stop() {
  int r = uv_cancel((uv_req_t*)&req);
  this->need_destroy_ = true;
  if (this->started) {
    uv_close((uv_handle_t*)&event_handle, InputEventHandler::OnStop);
  }
  return r;
}

void InputEventHandler::DoStart(uv_work_t* req) {
  InputEventHandler* handler = (InputEventHandler*)req->data;
  while (true) {
    if (handler->need_destroy_ == true) {
      break;
    }
    daemon_start_listener(&handler->keyevent_, &handler->gesture_);
    // Send InputKeyEvent
    if (handler->keyevent_.new_action) {
      InputKeyEvent* event = new InputKeyEvent();
      event->data.new_action = handler->keyevent_.new_action;
      event->data.value = handler->keyevent_.value;
      event->data.action = handler->keyevent_.action;
      event->data.key_code = handler->keyevent_.key_code;
      event->data.key_timeval = handler->keyevent_.key_timeval;

      uv_mutex_lock(&handler->event_mutex);
      handler->key_events.push_back(event);
      uv_mutex_unlock(&handler->event_mutex);
    }
    // Send InputGestureEvent
    if (handler->gesture_.new_action) {
      InputGestureEvent* event = new InputGestureEvent();
      event->data.new_action = handler->gesture_.new_action;
      event->data.action = handler->gesture_.action;
      event->data.key_code = handler->gesture_.key_code;
      event->data.slide_value = handler->gesture_.slide_value;
      event->data.click_count = handler->gesture_.click_count;
      event->data.long_press_time = handler->gesture_.long_press_time;

      uv_mutex_lock(&handler->event_mutex);
      handler->gesture_events.push_back(event);
      uv_mutex_unlock(&handler->event_mutex);
    }
    uv_async_send(&handler->event_handle);
  }
}

void InputEventHandler::AfterStart(uv_work_t* req, int status) {
  fprintf(stdout, "input event handler stopped\n");
}

void InputEventHandler::OnEvent(uv_async_t* async) {
  InputEventHandler* event_handler = (InputEventHandler*)async->data;
  iotjs_input_t* input = event_handler->inputwrap;
  IOTJS_VALIDATED_STRUCT_METHOD(iotjs_input_t, input);

  list<InputKeyEvent*> key_event_list;
  list<InputGestureEvent*> gesture_event_list;
  uv_mutex_lock(&event_handler->event_mutex);
  key_event_list.swap(event_handler->key_events);
  gesture_event_list.swap(event_handler->gesture_events);
  uv_mutex_unlock(&event_handler->event_mutex);

  jerry_value_t jthis = iotjs_jobjectwrap_jobject(&_this->jobjectwrap);
  jerry_value_t onevent = iotjs_jval_get_property(jthis, "onevent");
  if (!jerry_value_is_function(onevent)) {
    fprintf(stderr, "no onevent function is registered\n");
  } else {
    for (auto it = key_event_list.begin(); it != key_event_list.end(); ++it) {
      auto event = *it;

      iotjs_jargs_t jargs = iotjs_jargs_create(4);
      iotjs_jargs_append_number(&jargs, (double)event->data.value);
      iotjs_jargs_append_number(&jargs, (double)event->data.action);
      iotjs_jargs_append_number(&jargs, (double)event->data.key_code);

      struct timeval key_time = event->data.key_timeval;
      double jkey_time = static_cast<double>(key_time.tv_sec * 1000.0 +
                                             key_time.tv_usec / 1000);
      iotjs_jargs_append_number(&jargs, jkey_time);
      iotjs_make_callback(onevent, jerry_create_undefined(), &jargs);
      iotjs_jargs_destroy(&jargs);
    }
  }
  jerry_release_value(onevent);

  onevent = iotjs_jval_get_property(jthis, "ongesture");
  if (!jerry_value_is_function(onevent)) {
    fprintf(stderr, "no ongesture function is registered\n");
  } else {
    for (auto it = gesture_event_list.begin(); it != gesture_event_list.end();
         ++it) {
      auto event = *it;

      iotjs_jargs_t jargs = iotjs_jargs_create(5);
      iotjs_jargs_append_number(&jargs, (double)event->data.action);
      iotjs_jargs_append_number(&jargs, (double)event->data.key_code);
      iotjs_jargs_append_number(&jargs, (double)event->data.slide_value);
      iotjs_jargs_append_number(&jargs, (double)event->data.click_count);
      iotjs_jargs_append_number(&jargs, (double)event->data.long_press_time);
      iotjs_make_callback(onevent, jerry_create_undefined(), &jargs);
      iotjs_jargs_destroy(&jargs);
    }
  }
  jerry_release_value(onevent);
}

void InputEventHandler::OnStop(uv_handle_t* handle) {
  uv_async_t* async = (uv_async_t*)handle;
  auto event_handler = static_cast<InputEventHandler*>(async->data);
  uv_mutex_destroy(&event_handler->event_mutex);
  delete event_handler;
}

iotjs_input_t* iotjs_input_create(const jerry_value_t jinput) {
  iotjs_input_t* inputwrap = IOTJS_ALLOC(iotjs_input_t);
  IOTJS_VALIDATED_STRUCT_CONSTRUCTOR(iotjs_input_t, inputwrap);

  iotjs_jobjectwrap_initialize(&_this->jobjectwrap, jinput,
                               &this_module_native_info);
  _this->initializer = new InputInitializer(inputwrap);
  _this->event_handler = new InputEventHandler(inputwrap);
  return inputwrap;
}

void iotjs_input_destroy(iotjs_input_t* input) {
  IOTJS_VALIDATED_STRUCT_DESTRUCTOR(iotjs_input_t, input);
  iotjs_jobjectwrap_destroy(&_this->jobjectwrap);
  IOTJS_RELEASE(input);
}

JS_FUNCTION(Input) {
  DJS_CHECK_THIS();

  const jerry_value_t jinput = JS_GET_THIS();
  iotjs_input_t* input_instance = iotjs_input_create(jinput);
  return jerry_create_undefined();
}

JS_FUNCTION(Start) {
  JS_DECLARE_THIS_PTR(input, input);
  IOTJS_VALIDATED_STRUCT_METHOD(iotjs_input_t, input);

  int timeout_select = JS_GET_ARG(0, number);
  int timeout_dbclick = JS_GET_ARG(1, number);
  int timeout_slide = JS_GET_ARG(2, number);
  int r =
      _this->initializer->start(timeout_select, timeout_dbclick, timeout_slide);
  return jerry_create_number(r);
}

JS_FUNCTION(Disconnect) {
  JS_DECLARE_THIS_PTR(input, input);
  IOTJS_VALIDATED_STRUCT_METHOD(iotjs_input_t, input);

  if (!_this->initializer->initialized)
    _this->initializer->stop();
  if (_this->event_handler != NULL) {
    _this->event_handler->stop();
    _this->event_handler = NULL;
  }
  return jerry_create_boolean(true);
}

void init(jerry_value_t exports) {
  jerry_value_t jconstructor = jerry_create_external_function(Input);
  iotjs_jval_set_property_jval(exports, "InputWrap", jconstructor);

  jerry_value_t proto = jerry_create_object();
  iotjs_jval_set_method(proto, "start", Start);
  iotjs_jval_set_method(proto, "disconnect", Disconnect);
  iotjs_jval_set_property_jval(jconstructor, "prototype", proto);

  jerry_release_value(proto);
  jerry_release_value(jconstructor);
}

NODE_MODULE(light, init)
