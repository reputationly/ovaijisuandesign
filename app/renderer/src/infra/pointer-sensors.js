// 拖拽传感器还没对上已装的 @dnd-kit/core 公开 hook，调用方继续用这一份。
import reactExports from "react";

function useSensor(sensor, options) {
  return reactExports.useMemo(() => ({
    sensor,
    options: options != null ? options : {}
  }),
  // eslint-disable-next-line react-hooks/exhaustive-deps
  [sensor, options]);
}
function useSensors() {
  for (var _len = arguments.length, sensors = new Array(_len), _key = 0; _key < _len; _key++) {
    sensors[_key] = arguments[_key];
  }
  return reactExports.useMemo(() => [...sensors].filter(sensor => sensor != null),
  // eslint-disable-next-line react-hooks/exhaustive-deps
  [...sensors]);
}

export { useSensor, useSensors };
