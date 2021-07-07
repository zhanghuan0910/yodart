#include <stdlib.h>
#include <node_api.h>
#include <common.h>
#include <syslog.h>
#include <rklog/RKLog.h>

static napi_value Syslog(napi_env env, napi_callback_info info) {
  size_t argc = 3;
  napi_value argv[3];
  NAPI_CALL(env, napi_get_cb_info(env, info, &argc, argv, NULL, NULL));

  if (argc != 3) {
    napi_throw_error(env, nullptr, "The argument number is wrong.");
    return NULL;
  }

  napi_valuetype ident_type;
  char* ident = NULL;
  NAPI_CALL(env, napi_typeof(env, argv[0], &ident_type));
  if (ident_type == napi_string) {
    size_t ident_len = 0;
    NAPI_CALL(env,
              napi_get_value_string_utf8(env, argv[0], NULL, 0, &ident_len));
    ident = (char*)malloc(sizeof(char) * (ident_len + 1));
    NAPI_CALL(env, napi_get_value_string_utf8(env, argv[0], ident,
                                              ident_len + 1, &ident_len));
    ident[ident_len] = '\0';
  }

  int priority = 0;
  NAPI_CALL(env, napi_get_value_int32(env, argv[1], &priority));

  size_t msg_len = 0;
  NAPI_CALL(env, napi_get_value_string_utf8(env, argv[2], NULL, 0, &msg_len));
  char msg[msg_len + 1];
  NAPI_CALL(env, napi_get_value_string_utf8(env, argv[2], msg, msg_len + 1,
                                            &msg_len));
  msg[msg_len] = '\0';

  openlog(ident, ident == NULL ? LOG_PID : 0, LOG_USER);
  syslog(priority, "%s", msg);
  closelog();

  if (ident != NULL) {
    free(ident);
  }
  return NULL;
}

static napi_value Print(napi_env env, napi_callback_info info) {
  size_t argc = 3;
  napi_value argv[3];
  NAPI_CALL(env, napi_get_cb_info(env, info, &argc, argv, NULL, NULL));

  if (argc != 3) {
    napi_throw_error(env, nullptr, "The argument number is wrong.");
    return NULL;
  }

  int32_t level = -1;
  NAPI_CALL(env, napi_get_value_int32(env, argv[0], &level));

  size_t s1 = 0;
  NAPI_CALL(env, napi_get_value_string_utf8(env, argv[1], NULL, 0, &s1));
  char* tag = (char*)malloc(s1 + 1);
  NAPI_CALL(env, napi_get_value_string_utf8(env, argv[1], tag, s1 + 1, &s1));
  tag[s1] = 0;

  size_t s2 = 0;
  NAPI_CALL(env, napi_get_value_string_utf8(env, argv[2], NULL, 0, &s2));
  char* text = (char*)malloc(s2 + 1);
  NAPI_CALL(env, napi_get_value_string_utf8(env, argv[2], text, s2 + 1, &s2));
  text[s2] = 0;

  jslog(level, NULL, 0, tag, "%s", text);
  free(tag);
  free(text);
  return NULL;
}

static napi_value EnableCloud(napi_env env, napi_callback_info info) {
  size_t argc = 2;
  napi_value argv[2];
  NAPI_CALL(env, napi_get_cb_info(env, info, &argc, argv, NULL, NULL));

  int32_t enabled = 0;
  NAPI_CALL(env, napi_get_value_int32(env, argv[0], &enabled));

  size_t authorizationSize = 0;
  NAPI_CALL(env, napi_get_value_string_utf8(env, argv[1], NULL, 0,
                                            &authorizationSize));
  char authorization[authorizationSize + 1];
  NAPI_CALL(env, napi_get_value_string_utf8(env, argv[1], authorization,
                                            authorizationSize + 1,
                                            &authorizationSize));
  authorization[authorizationSize] = '\0';

  set_cloudlog_on_with_auth(enabled, authorization);

  return NULL;
}

static napi_value Init(napi_env env, napi_value exports) {
  napi_property_descriptor desc[] = { DECLARE_NAPI_PROPERTY("syslog", Syslog),
                                      DECLARE_NAPI_PROPERTY("print", Print),
                                      DECLARE_NAPI_PROPERTY("enableCloud",
                                                            EnableCloud) };
  NAPI_CALL(env, napi_define_properties(env, exports,
                                        sizeof(desc) / sizeof(*desc), desc));
  return exports;
}

NAPI_MODULE(logger, Init)
