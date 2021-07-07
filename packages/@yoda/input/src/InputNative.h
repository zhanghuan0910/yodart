#ifndef INPUT_NATIVE_H
#define INPUT_NATIVE_H

#include <stdio.h>
#include <list>

#ifdef __cplusplus
extern "C" {
#endif /* __cplusplus */

#include <iotjs.h>
#include <iotjs_def.h>
#include <iotjs_binding.h>
#include <iotjs_objectwrap.h>
#include <uv.h>
#include <input-event/input-event.h>

using namespace std;

class InputInitializer;
class InputEventHandler;

typedef struct {
  iotjs_jobjectwrap_t jobjectwrap;
  InputInitializer* initializer;
  InputEventHandler* event_handler;
} IOTJS_VALIDATED_STRUCT(iotjs_input_t);

static iotjs_input_t* iotjs_input_create(const jerry_value_t jinput);
static void iotjs_input_destroy(iotjs_input_t* input);

class InputKeyEvent {
 public:
  struct keyevent data;
};

class InputGestureEvent {
 public:
  struct gesture data;
};

class InputEventHandler {
 public:
  InputEventHandler();
  InputEventHandler(iotjs_input_t*);
  ~InputEventHandler();

 public:
  int start();
  int stop();

 public:
  static void DoStart(uv_work_t* req);
  static void AfterStart(uv_work_t* req, int status);
  static void OnEvent(uv_async_t* async);
  static void OnStop(uv_handle_t* handle);

 private:
  iotjs_input_t* inputwrap;
  struct keyevent keyevent_;
  struct gesture gesture_;
  bool started = false;
  bool need_destroy_;
  uv_work_t req;
  uv_async_t event_handle;
  list<InputKeyEvent*> key_events;
  list<InputGestureEvent*> gesture_events;
  uv_mutex_t event_mutex;
};

#ifdef __cplusplus
}
#endif /* __cplusplus */
#endif // INPUT_NATIVE_H
