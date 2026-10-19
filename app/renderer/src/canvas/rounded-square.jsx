import { CompositedSvg } from "../media-editing/icon-compositing.js";
import { __jsx } from "../shared/jsx-runtime.js";
export const ROUNDED_SQUARE =
  "M17.4004 0C18.836 0.000211016 19.9998 1.16398 20 2.59961V17.4004C19.9998 18.836 18.836 19.9998 17.4004 20H2.59961C1.16398 19.9998 0.000211016 18.836 0 17.4004V2.59961C0.000211016 1.16398 1.16398 0.000211016 2.59961 0H17.4004Z";

export function FilledNodeTypeIcon({ size: size2 = 14, path: path2, ...props }) {
  return (
    <CompositedSvg width={size2} height={size2} viewBox="0 0 20 20" fill="currentColor" aria-hidden="true" {...props}>
      <path d={path2} />
    </CompositedSvg>
  );
}

export const IMAGE_PATH = `${ROUNDED_SQUARE}M8.4248 7.70801C8.23163 7.38605 7.76543 7.38392 7.56934 7.7041L2.3418 16.2393C2.13811 16.5724 2.378 17 2.76855 17H17.3525C17.7602 17 17.996 16.5386 17.7578 16.208L14.4053 11.5625C14.2057 11.286 13.7943 11.286 13.5947 11.5625L12.0342 13.7236L8.4248 7.70801ZM14.5 4C13.6716 4 13 4.67157 13 5.5C13 6.32843 13.6716 7 14.5 7C15.3284 7 16 6.32843 16 5.5C16 4.67157 15.3284 4 14.5 4Z`;

export const VIDEO_PATH = `${ROUNDED_SQUARE}M8.53125 5.96094C7.86529 5.5432 7.00008 6.02151 7 6.80762V13.1992C7 13.9839 7.86223 14.4625 8.52832 14.0479L13.6416 10.8643C14.2689 10.4736 14.2706 9.56066 13.6445 9.16797L8.53125 5.96094Z`;

export const TEXT_PATH = `${ROUNDED_SQUARE}M4 16.2646H12V14.4648H4V16.2646ZM4 12.6885H16V10.8887H4V12.6885ZM4 9.1123H16V7.31152H4V9.1123ZM4 5.53613H16V3.73535H4V5.53613Z`;

export const TABLE_PATH =
  "M17.4 0H2.6C1.164 0 0 1.164 0 2.6v14.8C0 18.836 1.164 20 2.6 20h14.8c1.436 0 2.6-1.164 2.6-2.6V2.6C20 1.164 18.836 0 17.4 0zM2 7h5v3H2V7zm0 5h5v3H2v-3zm7 3v-3h9v3H9zm9-5H9V7h9v3zM2 5V2h16v3H2z";

export function NodeTypeImageIcon(props) {
  return <FilledNodeTypeIcon path={IMAGE_PATH} {...props} />;
}

export function NodeTypeVideoIcon(props) {
  return <FilledNodeTypeIcon path={VIDEO_PATH} {...props} />;
}

export function NodeTypeTextIcon(props) {
  return <FilledNodeTypeIcon path={TEXT_PATH} {...props} />;
}

export function NodeTypeTableIcon(props) {
  return <FilledNodeTypeIcon path={TABLE_PATH} {...props} />;
}
