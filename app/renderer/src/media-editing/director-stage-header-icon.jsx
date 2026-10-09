// director-stage-header-icon.jsx
import { CompositedSvg, reactExports } from "../vendor.js";
import { __jsx } from "../shared/jsx-runtime.js";

export function DirectorStageHeaderIcon({ size: size2 = 14, className } = {}) {
  return (
    <CompositedSvg
      width={size2}
      height={size2}
      viewBox="0 0 24 24"
      fill="none"
      className={className}
      aria-hidden="true"
    >
      <path
        d="M22.4351 17.4581C22.4351 17.6416 22.3371 17.8082 22.1695 17.9025L12.2095 23.3966C12.1321 23.4379 12.0531 23.4581 11.9654 23.4581C11.9099 23.4581 11.8451 23.445 11.7779 23.4181L11.7105 23.3868L1.81793 17.8907C1.74166 17.8474 1.67775 17.7848 1.63336 17.7091C1.59989 17.652 1.57874 17.5888 1.56989 17.5236L1.565 17.4572V7.98938L10.4654 12.8448V22.1281L11.233 21.6398L13.233 20.3702L13.4654 20.2228V12.8273L22.4351 7.69836V17.4581Z"
        fill="currentColor"
        stroke="currentColor"
      />
      <path
        d="M11.965 10.808H11.955L11.96 10.805L11.965 10.808ZM11.155 0.247008C11.655 -0.022992 12.265 -0.032992 12.775 0.247008L21.815 5.17701L11.959 10.805L1.97501 5.35801L11.155 0.247008Z"
        fill="currentColor"
      />
    </CompositedSvg>
  );
}

export function VideoEditorHeaderIcon({ size: size2 = 14, className } = {}) {
  return (
    <CompositedSvg
      width={size2}
      height={size2}
      viewBox="0 0 24 24"
      fill="none"
      className={className}
      aria-hidden="true"
    >
      <path
        d="M19 2C20.6569 2 22 3.34315 22 5V19C22 20.6569 20.6569 22 19 22H5C3.34315 22 2 20.6569 2 19V5C2 3.34315 3.34315 2 5 2H19ZM17.707 6.29297C17.3165 5.90266 16.6824 5.90252 16.292 6.29297L11.999 10.585L10.8252 9.41113C10.936 9.12848 11 8.82196 11 8.5C11 7.11929 9.88071 6 8.5 6C7.11929 6 6 7.11929 6 8.5C6 9.88071 7.11929 11 8.5 11C8.82196 11 9.12848 10.936 9.41113 10.8252L10.585 11.999L9.41016 13.1729C9.12792 13.0624 8.82138 13 8.5 13C7.11929 13 6 14.1193 6 15.5C6 16.8807 7.11929 18 8.5 18C9.88071 18 11 16.8807 11 15.5C11 15.1777 10.9362 14.8708 10.8252 14.5879L17.707 7.70703C18.0973 7.31656 18.0973 6.68344 17.707 6.29297ZM15.5273 14.1133C15.1368 13.7228 14.5038 13.7228 14.1133 14.1133C13.7228 14.5038 13.7228 15.1368 14.1133 15.5273L16.293 17.707C16.6835 18.0972 17.3166 18.0974 17.707 17.707C18.0975 17.3166 18.0972 16.6835 17.707 16.293L15.5273 14.1133ZM8.5 15C8.63434 15 8.75587 15.0534 8.8457 15.1396C8.84812 15.1421 8.85009 15.145 8.85254 15.1475C8.85459 15.1495 8.85731 15.1513 8.85938 15.1533C8.94615 15.2433 9 15.3652 9 15.5C9 15.7761 8.77614 16 8.5 16C8.22386 16 8 15.7761 8 15.5C8 15.2239 8.22386 15 8.5 15ZM8.5 8C8.77614 8 9 8.22386 9 8.5C9 8.77614 8.77614 9 8.5 9C8.22386 9 8 8.77614 8 8.5C8 8.22386 8.22386 8 8.5 8Z"
        fill="currentColor"
      />
    </CompositedSvg>
  );
}

const CanvasRootElementContext = reactExports.createContext(null);

export const CanvasRootElementProvider = CanvasRootElementContext.Provider;

export function useCanvasRootElement() {
  return reactExports.useContext(CanvasRootElementContext);
}
