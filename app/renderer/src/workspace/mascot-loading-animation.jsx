// mascot-loading-animation.jsx
import { reactExports } from "../vendor.js";
import { __jsx } from "../shared/jsx-runtime.js";

const SYMBOLS = [
  "lens",
  "core",
  "network",
  "heart",
  "bars",
  "equalizer",
  "spark",
];

export function MascotLoadingAnimation() {
  const [symbolIndex, setSymbolIndex] = reactExports.useState(0);
  reactExports.useEffect(() => {
    const reduceMotion =
      window.matchMedia?.("(prefers-reduced-motion: reduce)").matches ?? false;
    if (reduceMotion) return;
    const timer2 = window.setInterval(() => {
      setSymbolIndex((current2) => (current2 + 1) % SYMBOLS.length);
    }, 1320);
    return () => window.clearInterval(timer2);
  }, []);
  const activeSymbol = SYMBOLS[symbolIndex];
  const isActive2 = (symbol) => (activeSymbol === symbol ? "true" : "false");
  return (
    <div className="workspace-mascot-loader" aria-hidden="true">
      <div className="workspace-mascot-loader-frame">
        <svg
          className="workspace-mascot-loader-svg"
          viewBox="0 0 191 191"
          fill="none"
          xmlns="http://www.w3.org/2000/svg"
          role="presentation"
        >
          <defs>
            <clipPath id="workspaceMascotLoaderClip">
              <rect
                width="190.611"
                height="190.611"
                rx="95.3055"
                fill="white"
              />
            </clipPath>
          </defs>
          <g clipPath="url(#workspaceMascotLoaderClip)">
            <rect
              width="190.611"
              height="190.611"
              rx="95.3055"
              fill="var(--workspace-loader-orb)"
            />
            <g className="workspace-mascot-loader-body">
              <path
                d="M150.6 119.681C156.534 120.855 166.012 124.697 168.657 137.215C170.791 147.323 161.017 149.879 157.978 144.222C156.303 141.103 154.535 136.698 151.702 134.725C151.315 152.521 144.954 170.291 132.386 184.793C120.502 198.508 104.935 207.143 88.4289 210.505L88.8248 212.542L88.8102 212.538C91.2618 225.168 83.0358 237.395 70.4093 239.884C57.8061 242.367 45.5843 234.145 43.134 221.535L40.4063 207.5C40.1174 206.016 39.2409 204.896 38.1161 204.233C37.8874 204.122 37.6589 204.01 37.431 203.897C35.6185 203.175 33.3971 203.517 31.9117 205.231C23.5195 214.936 8.8581 215.998 -0.85377 207.635L-0.939586 207.56C-10.5989 199.136 -11.6327 184.473 -3.22042 174.786C-1.70586 173.038 -1.71035 170.734 -2.74158 169.032C-2.84306 168.884 -2.94451 168.736 -3.04488 168.588C-3.86007 167.522 -5.11949 166.775 -6.67387 166.7L-20.954 165.996C-33.7802 165.359 -43.6612 154.436 -42.9916 141.603C-42.3276 128.756 -31.3945 118.874 -18.545 119.505L-16.448 119.608C-15.4651 102.795 -9.13097 86.1633 2.75101 72.4521C15.0778 58.2278 31.3653 49.4661 48.5543 46.3859C47.2858 42.2528 41.1293 40.8802 36.9781 39.3641C30.9465 37.1612 32.105 26.9172 42.3952 27.7971C58.6155 29.1841 62.3895 39.9043 63.2642 45.1412C103.074 45.4744 143.957 80.5114 150.6 119.681Z"
                fill="var(--workspace-loader-body)"
              />
            </g>
            <g className="workspace-mascot-loader-icon-stage">
              <g
                className="workspace-mascot-loader-symbol"
                data-active={isActive2("core")}
              >
                <path
                  d="M59.4232 98.9272L63.7596 90.2544H81.1052L85.4416 98.9272H59.4232Z"
                  fill="var(--workspace-loader-icon)"
                  stroke="var(--workspace-loader-icon)"
                  strokeWidth="5.78186"
                  strokeLinejoin="round"
                />
                <path
                  d="M97.0051 98.9269H47.8593C45.4644 98.9269 43.5229 100.868 43.5229 103.263V137.954C43.5229 140.349 45.4644 142.291 47.8593 142.291H97.0051C99.4 142.291 101.341 140.349 101.341 137.954V103.263C101.341 100.868 99.4 98.9269 97.0051 98.9269Z"
                  fill="var(--workspace-loader-icon)"
                  stroke="var(--workspace-loader-icon)"
                  strokeWidth="5.78186"
                  strokeLinejoin="round"
                />
                <path
                  d="M72.4321 132.173C78.8186 132.173 83.9958 126.996 83.9958 120.609C83.9958 114.223 78.8186 109.046 72.4321 109.046C66.0456 109.046 60.8683 114.223 60.8683 120.609C60.8683 126.996 66.0456 132.173 72.4321 132.173Z"
                  fill="var(--workspace-loader-body)"
                  stroke="var(--workspace-loader-body)"
                  strokeWidth="5.78186"
                  strokeLinejoin="round"
                />
              </g>
              <g
                className="workspace-mascot-loader-symbol"
                data-active={isActive2("network")}
              >
                <path
                  d="M72.7498 149.312C63.9872 149.312 55.5836 145.831 49.3875 139.635C43.1914 133.439 39.7105 125.035 39.7105 116.273C39.7105 107.51 43.1914 99.1064 49.3875 92.9104C55.5836 86.7143 63.9872 83.2334 72.7498 83.2334C81.5123 83.2334 89.916 86.3662 96.112 91.9427C102.308 97.5191 105.789 105.082 105.789 112.969C105.789 117.35 104.049 121.552 100.951 124.65C97.8525 127.748 93.6507 129.488 89.2694 129.488H81.8356C80.7618 129.488 79.7092 129.787 78.7958 130.352C77.8825 130.916 77.1443 131.724 76.6641 132.684C76.1839 133.645 75.9806 134.72 76.0771 135.789C76.1735 136.859 76.5658 137.88 77.2101 138.739L78.2012 140.061C78.8455 140.92 79.2378 141.941 79.3342 143.011C79.4307 144.08 79.2274 145.155 78.7472 146.116C78.2672 147.076 77.5289 147.884 76.6155 148.448C75.7021 149.013 74.6495 149.312 73.5757 149.312H72.7498Z"
                  fill="var(--workspace-loader-icon)"
                />
                <path
                  d="M77.7048 99.7531C78.6171 99.7531 79.3567 99.0135 79.3567 98.1011C79.3567 97.1888 78.6171 96.4492 77.7048 96.4492C76.7924 96.4492 76.0528 97.1888 76.0528 98.1011C76.0528 99.0135 76.7924 99.7531 77.7048 99.7531Z"
                  fill="var(--workspace-loader-body)"
                  stroke="var(--workspace-loader-body)"
                  strokeWidth="6.56246"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
                <path
                  d="M90.9214 112.968C91.8338 112.968 92.5734 112.228 92.5734 111.316C92.5734 110.403 91.8338 109.664 90.9214 109.664C90.0091 109.664 89.2695 110.403 89.2695 111.316C89.2695 112.228 90.0091 112.968 90.9214 112.968Z"
                  fill="var(--workspace-loader-body)"
                  stroke="var(--workspace-loader-body)"
                  strokeWidth="6.56246"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
                <path
                  d="M54.5792 119.577C55.4916 119.577 56.2312 118.837 56.2312 117.925C56.2312 117.012 55.4916 116.273 54.5792 116.273C53.6669 116.273 52.9273 117.012 52.9273 117.925C52.9273 118.837 53.6669 119.577 54.5792 119.577Z"
                  fill="var(--workspace-loader-body)"
                  stroke="var(--workspace-loader-body)"
                  strokeWidth="6.56246"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
                <path
                  d="M61.1852 103.057C62.0975 103.057 62.8371 102.317 62.8371 101.405C62.8371 100.493 62.0975 99.753 61.1852 99.753C60.2728 99.753 59.5332 100.493 59.5332 101.405C59.5332 102.317 60.2728 103.057 61.1852 103.057Z"
                  fill="var(--workspace-loader-body)"
                  stroke="var(--workspace-loader-body)"
                  strokeWidth="6.56246"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
              </g>
              <g
                className="workspace-mascot-loader-symbol"
                data-active={isActive2("lens")}
              >
                <path
                  d="M72.4373 146.982C89.3977 146.982 103.147 133.233 103.147 116.272C103.147 99.3118 89.3977 85.5626 72.4373 85.5626C55.4769 85.5626 41.7278 99.3118 41.7278 116.272C41.7278 133.233 55.4769 146.982 72.4373 146.982Z"
                  fill="var(--workspace-loader-icon)"
                />
                <path
                  d="M60.1535 116.272C60.1535 104.838 64.5518 93.8424 72.4373 85.5626C80.3228 93.8424 84.7211 104.838 84.7211 116.272C84.7211 127.706 80.3228 138.702 72.4373 146.982C64.5518 138.702 60.1535 127.706 60.1535 116.272Z"
                  fill="var(--workspace-loader-icon)"
                  stroke="var(--workspace-loader-body)"
                  strokeWidth="4.97706"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
                <path
                  d="M41.7278 116.273H103.147"
                  stroke="var(--workspace-loader-body)"
                  strokeWidth="4.97706"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
              </g>
              <g
                className="workspace-mascot-loader-symbol"
                data-active={isActive2("bars")}
              >
                <path
                  d="M37.6281 141.687H97.6352"
                  stroke="var(--workspace-loader-icon)"
                  strokeWidth="6.2831"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
                <path
                  d="M52.6285 120.685H43.6274V141.687H52.6285V120.685Z"
                  fill="var(--workspace-loader-icon)"
                  stroke="var(--workspace-loader-icon)"
                  strokeWidth="6.2831"
                  strokeLinejoin="round"
                />
                <path
                  d="M72.1319 105.683H63.1309V141.687H72.1319V105.683Z"
                  fill="var(--workspace-loader-icon)"
                  stroke="var(--workspace-loader-icon)"
                  strokeWidth="6.2831"
                  strokeLinejoin="round"
                />
                <path
                  d="M91.6353 87.6809H82.6342V141.687H91.6353V87.6809Z"
                  fill="var(--workspace-loader-icon)"
                  stroke="var(--workspace-loader-icon)"
                  strokeWidth="6.2831"
                  strokeLinejoin="round"
                />
              </g>
              <g
                className="workspace-mascot-loader-symbol"
                data-active={isActive2("heart")}
              >
                <path
                  d="M59.2642 91.0166C49.5178 91.0166 41.6168 98.8563 41.6168 108.527C41.6168 126.037 62.4728 141.956 73.703 145.658C84.9332 141.956 105.789 126.037 105.789 108.527C105.789 98.8563 97.8881 91.0166 88.1418 91.0166C82.1733 91.0166 76.8967 93.9566 73.703 98.4566C70.5092 93.9566 65.2327 91.0166 59.2642 91.0166Z"
                  fill="var(--workspace-loader-icon)"
                />
              </g>
              <g
                className="workspace-mascot-loader-symbol"
                data-active={isActive2("equalizer")}
              >
                <path
                  d="M73.7028 89.5871V147.088"
                  stroke="var(--workspace-loader-icon)"
                  strokeWidth="9.53055"
                  strokeLinecap="round"
                />
                <path
                  d="M88.634 101.087V135.588"
                  stroke="var(--workspace-loader-icon)"
                  strokeWidth="9.53055"
                  strokeLinecap="round"
                />
                <path
                  d="M43.8405 109.712V126.963"
                  stroke="var(--workspace-loader-icon)"
                  strokeWidth="9.53055"
                  strokeLinecap="round"
                />
                <path
                  d="M103.565 109.712V126.963"
                  stroke="var(--workspace-loader-icon)"
                  strokeWidth="9.53055"
                  strokeLinecap="round"
                />
                <path
                  d="M58.7716 101.087V135.588"
                  stroke="var(--workspace-loader-icon)"
                  strokeWidth="9.53055"
                  strokeLinecap="round"
                />
              </g>
              <g
                className="workspace-mascot-loader-symbol"
                data-active={isActive2("spark")}
              >
                <path
                  d="M44.9892 118.955L63.5918 125.297C64.2987 125.538 64.7422 126.239 64.6574 126.981L61.9984 150.216C61.8318 151.67 63.555 152.556 64.6414 151.575L99.7426 119.862C100.621 119.068 100.354 117.627 99.2491 117.201L79.7006 109.664C79.0146 109.4 78.5998 108.699 78.6978 107.97L82.0841 82.7942C82.2865 81.2895 80.4646 80.3856 79.3889 81.4571L44.3809 116.326C43.5466 117.157 43.8748 118.575 44.9892 118.955Z"
                  fill="var(--workspace-loader-icon)"
                />
              </g>
            </g>
          </g>
        </svg>
      </div>
    </div>
  );
}
