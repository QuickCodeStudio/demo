/**
 * QuickCode Default icon loader (draw-in traces).
 * Use on loading overlays — not in navbar, favicon, or 16–20px chrome.
 */
(function (root) {
    'use strict';

    var ICON_TRACES = [
        'M180.977,56.446 L326.091,56.446 C337.476,56.446 347.186,60.464 355.223,68.501 L401.432,114.710 C408.799,122.077 418.175,125.760 429.560,125.760 L502.711,125.760',
        'M237.539,130.356 L297.161,130.783 C308.546,130.783 318.257,134.801 326.293,142.838 L368.484,185.029 C376.521,193.065 386.232,197.083 397.617,197.083 L439.139,196.596',
        'M209.010,203.687 L265.933,203.687 C277.318,203.687 287.028,207.705 295.065,215.741 L333.238,253.914 C341.274,261.951 350.985,265.969 362.370,265.969 L482.796,265.969',
        'M84.676,310.415 L137.107,361.226 C145.144,369.263 154.854,373.281 166.239,373.281 L279.754,373.281 C291.139,373.281 300.849,369.263 308.886,361.226 L329.981,340.131 C338.018,332.094 347.728,328.076 359.113,328.076 L495.792,328.076',
        'M161.070,481.712 L193.362,449.226 C201.399,441.189 211.109,437.171 222.494,437.171 L309.890,437.171 C321.275,437.171 330.986,433.153 339.022,425.117 L363.131,401.007 C371.168,392.971 380.878,388.953 392.263,388.953 L502.950,388.953',
    ];

    var ICON_PADS = [
        { x: 131.096, y: 56.807, d: 'M131.096,103.016 C105.746,103.016 84.886,82.156 84.886,56.807 C84.886,31.457 105.746,10.597 131.096,10.597 C156.445,10.597 177.305,31.457 177.305,56.807 C177.305,82.156 156.445,103.016 131.096,103.016 ZM131.096,34.707 C118.972,34.707 108.996,44.683 108.996,56.807 C108.996,68.931 118.972,78.907 131.096,78.907 C143.219,78.907 153.196,68.931 153.196,56.807 C153.196,44.683 143.219,34.707 131.096,34.707 Z' },
        { x: 169.496, y: 202.727, d: 'M169.496,248.936 C144.146,248.936 123.286,228.077 123.286,202.727 C123.286,177.377 144.146,156.518 169.496,156.518 C194.845,156.518 215.705,177.377 215.705,202.727 C215.705,228.077 194.845,248.936 169.496,248.936 ZM169.496,180.627 C157.372,180.627 147.396,190.603 147.396,202.727 C147.396,214.851 157.372,224.827 169.496,224.827 C181.619,224.827 191.596,214.851 191.596,202.727 C181.619,190.603 181.619,180.627 169.496,180.627 Z' },
        { x: 57.176, y: 280.487, d: 'M57.176,326.696 C31.826,326.696 10.966,305.837 10.966,280.487 C10.966,255.137 31.826,234.278 57.176,234.278 C82.525,234.278 103.385,255.137 103.385,280.487 C103.385,305.837 82.525,326.696 57.176,326.696 ZM57.176,258.387 C45.052,258.387 35.076,268.363 35.076,280.487 C35.076,292.611 45.052,302.587 57.176,302.587 C69.299,302.587 79.276,292.611 79.276,280.487 C79.276,268.363 69.299,258.387 57.176,258.387 Z' },
        { x: 135.896, y: 508.967, d: 'M135.896,555.176 C110.546,555.176 89.686,534.317 89.686,508.967 C89.686,483.617 110.546,462.758 135.896,462.758 C161.245,462.758 182.105,483.617 182.105,508.967 C182.105,534.317 161.245,555.176 135.896,555.176 ZM135.896,486.867 C123.772,486.867 113.796,496.843 113.796,508.967 C113.796,521.091 123.772,531.067 135.896,531.067 C148.019,531.067 157.996,521.091 157.996,508.967 C157.996,496.843 148.019,486.867 135.896,486.867 Z' },
    ];

    var ICON_Q =
        'M662.435,372.782 C632.725,372.571 607.403,361.851 586.474,340.617 C565.538,319.389 555.179,293.917 555.390,264.207 C555.600,234.503 566.320,209.181 587.554,188.246 C608.782,167.316 634.254,156.951 663.964,157.162 C693.668,157.373 718.990,168.098 739.925,189.326 C760.855,210.561 771.220,236.032 771.009,265.736 C770.798,295.446 760.073,320.768 738.845,341.698 C717.610,362.633 692.139,372.992 662.435,372.782 ZM925.950,505.467 C926.142,476.446 926.754,384.060 926.754,384.060 C926.754,384.060 927.722,374.533 916.786,374.252 C906.077,374.313 890.632,374.400 890.632,374.400 C906.434,341.931 914.477,306.050 914.755,266.756 C915.248,197.280 891.108,137.810 842.347,88.347 C793.580,38.889 734.459,13.908 664.983,13.416 C595.502,12.923 536.032,37.063 486.575,85.824 C437.111,134.591 412.136,193.713 411.643,263.188 C411.150,332.669 435.285,392.139 484.052,441.597 C532.813,491.060 591.934,516.035 661.416,516.528 C661.416,516.528 852.122,518.423 909.635,518.994 C916.546,518.936 925.963,516.585 925.950,505.467 Z';

    var CIRCUIT_PADS = [ICON_PADS[0], null, ICON_PADS[1], ICON_PADS[2], ICON_PADS[3]];
    var seq = 0;

    var LOGO_TRACES = [
        'M672.315,96.782 L837.079,96.782 C850.006,96.782 861.032,101.344 870.156,110.469 L922.623,162.936 C930.987,171.300 941.633,175.482 954.559,175.482 L1037.617,175.482',
        'M736.536,180.700 L804.232,181.185 C817.159,181.185 828.184,185.748 837.309,194.872 L885.214,242.777 C894.338,251.901 905.364,256.464 918.291,256.464 L965.436,255.910',
        'M704.144,263.961 L768.775,263.961 C781.701,263.961 792.727,268.524 801.851,277.648 L845.194,320.990 C854.318,330.115 865.344,334.677 878.271,334.677 L1015.005,334.677',
        'M562.973,385.142 L622.504,442.834 C631.629,451.959 642.654,456.521 655.581,456.521 L784.467,456.521 C797.394,456.521 808.420,451.959 817.544,442.834 L841.496,418.882 C850.621,409.757 861.647,405.195 874.573,405.195 L1029.761,405.195',
        'M649.712,579.636 L686.377,542.750 C695.501,533.626 706.527,529.063 719.454,529.063 L818.685,529.063 C831.611,529.063 842.637,524.501 851.762,515.376 L879.136,488.002 C888.260,478.878 899.286,474.315 912.213,474.315 L1037.889,474.315',
    ];
    var LOGO_PADS = [
        { x: 615.679, y: 97.191, d: 'M615.679,149.658 C586.896,149.658 563.212,125.974 563.212,97.191 C563.212,68.409 586.896,44.724 615.679,44.724 C644.461,44.724 668.145,68.409 668.145,97.191 C668.145,125.974 644.461,149.658 615.679,149.658 ZM615.679,72.098 C601.913,72.098 590.586,83.426 590.586,97.191 C590.586,110.957 601.913,122.284 615.679,122.284 C629.444,122.284 640.771,110.957 640.771,97.191 C640.771,83.426 629.444,72.098 615.679,72.098 Z' },
        { x: 659.279, y: 262.871, d: 'M659.279,315.338 C630.496,315.338 606.812,291.654 606.812,262.871 C606.812,234.089 630.496,210.404 659.279,210.404 C688.061,210.404 711.745,234.089 711.745,262.871 C711.745,291.654 688.061,315.338 659.279,315.338 ZM659.279,237.778 C645.513,237.778 634.186,249.106 634.186,262.871 C634.186,276.637 645.513,287.964 659.279,287.964 C673.044,287.964 684.371,276.637 684.371,262.871 C684.371,249.106 673.044,237.778 659.279,237.778 Z' },
        { x: 531.748, y: 351.161, d: 'M531.748,403.628 C502.966,403.628 479.281,379.944 479.281,351.161 C479.281,322.379 502.966,298.694 531.748,298.694 C560.531,298.694 584.215,322.379 584.215,351.161 C584.215,379.944 560.531,403.628 531.748,403.628 ZM531.748,326.068 C517.983,326.068 506.656,337.396 506.656,351.161 C506.656,364.927 517.983,376.254 531.748,376.254 C545.514,376.254 556.841,364.927 556.841,351.161 C556.841,337.396 545.514,326.068 531.748,326.068 Z' },
        { x: 621.128, y: 610.581, d: 'M621.128,663.048 C592.346,663.048 568.661,639.364 568.661,610.581 C568.661,581.799 592.346,558.114 621.128,558.114 C649.911,558.114 673.595,581.799 673.595,610.581 C673.595,639.364 649.911,663.048 621.128,663.048 ZM621.128,585.488 C607.363,585.488 596.036,596.816 596.036,610.581 C596.036,624.347 607.363,635.674 621.128,635.674 C634.894,635.674 646.221,624.347 646.221,610.581 C646.221,596.816 634.894,585.488 621.128,585.488 Z' },
    ];
    var LOGO_Q = 'M1218.970,455.954 C1185.237,455.715 1156.486,443.544 1132.722,419.434 C1108.952,395.331 1097.189,366.410 1097.429,332.677 C1097.668,298.951 1109.839,270.200 1133.949,246.430 C1158.052,222.666 1186.973,210.897 1220.706,211.136 C1254.432,211.375 1283.183,223.553 1306.954,247.656 C1330.717,271.766 1342.486,300.687 1342.247,334.413 C1342.008,368.146 1329.830,396.897 1305.727,420.661 C1281.617,444.431 1252.696,456.193 1218.970,455.954 ZM1518.169,606.608 C1518.387,573.657 1519.082,468.760 1519.082,468.760 C1519.082,468.760 1520.182,457.943 1507.765,457.624 C1495.605,457.693 1478.069,457.791 1478.069,457.791 C1496.010,420.927 1505.142,380.186 1505.459,335.571 C1506.018,256.687 1478.609,189.164 1423.245,133.002 C1367.874,76.847 1300.747,48.484 1221.863,47.924 C1142.973,47.365 1075.450,74.774 1019.295,130.138 C963.134,185.509 934.776,252.636 934.217,331.520 C933.657,410.410 961.060,477.933 1016.431,534.088 C1071.795,590.250 1138.922,618.607 1217.813,619.166 C1217.813,619.166 1434.344,621.318 1499.644,621.967 C1507.492,621.900 1518.184,619.231 1518.169,606.608 Z';
    var LOGO_CIRCUIT_PADS = [LOGO_PADS[0], null, LOGO_PADS[1], LOGO_PADS[2], LOGO_PADS[3]];
    var LOGO_TM = '4.39442066053203 0.03115994842302 -0.03115994759757 4.39442077694442';
    var LOGO_WORD = {
        lt: 'M104.167 -129.63V-92.593L57.87 -64.815L104.167 -37.037V0L2.315 -64.815Z',
        slash: 'M124.074 -148.148 41.019 18.519H2.315L86.482 -148.148Z',
        gt: 'M128.704 0V-37.037L175 -64.815L128.704 -92.593V-129.63L230.556 -64.815Z',
        u: 'M2.315 -64.815V-129.63H39.352V-64.815Q39.352 -37.037 57.87 -37.037Q76.389 -37.037 76.389 -64.815V-129.63H113.426V-64.815Q113.426 0 57.87 0Q2.315 0 2.315 -64.815Z',
        i: 'M168.704 -129.63V0H131.667V-129.63Z',
        cu: 'M295.834 -18.982Q276.852 0 250 0Q223.149 0 204.167 -18.982Q185.186 -37.963 185.186 -64.815Q185.186 -91.667 204.167 -110.648Q223.149 -129.63 250 -129.63Q276.852 -129.63 295.834 -110.648Q305.371 -101.111 310.186 -89.537L276.389 -73.704Q274.445 -79.63 269.63 -84.445Q261.482 -92.593 250 -92.593Q238.519 -92.593 230.371 -84.445Q222.223 -76.296 222.223 -64.815Q222.223 -53.333 230.371 -45.185Q238.519 -37.037 250 -37.037Q261.482 -37.037 269.63 -45.185Q274.075 -49.63 276.112 -55.185L310.093 -40.093Q305.371 -28.519 295.834 -18.982Z',
        k: 'M329.167 -129.63H366.204V-83.333L403.242 -129.63H449.538L393.982 -64.815L449.538 0H403.242L366.204 -46.296V0H329.167Z',
        cc: 'M112.963 -18.982Q93.982 0 67.13 0Q40.278 0 21.296 -18.982Q2.315 -37.963 2.315 -64.815Q2.315 -91.667 21.296 -110.648Q40.278 -129.63 67.13 -129.63Q93.982 -129.63 112.963 -110.648Q122.5 -101.111 127.315 -89.537L93.519 -73.704Q91.574 -79.63 86.759 -84.445Q78.611 -92.593 67.13 -92.593Q55.648 -92.593 47.5 -84.445Q39.352 -76.296 39.352 -64.815Q39.352 -53.333 47.5 -45.185Q55.648 -37.037 67.13 -37.037Q78.611 -37.037 86.759 -45.185Q91.204 -49.63 93.241 -55.185L127.222 -40.093Q122.5 -28.519 112.963 -18.982Z',
        o: 'M208.149 0Q181.297 0 162.315 -18.982Q143.334 -37.963 143.334 -64.815Q143.334 -91.667 162.315 -110.648Q181.297 -129.63 208.149 -129.63Q235 -129.63 253.982 -110.648Q272.963 -91.667 272.963 -64.815Q272.963 -37.963 253.982 -18.982Q235 0 208.149 0ZM235.926 -64.815Q235.926 -76.296 227.778 -84.445Q219.63 -92.593 208.149 -92.593Q196.667 -92.593 188.519 -84.445Q180.371 -76.296 180.371 -64.815Q180.371 -53.333 188.519 -45.185Q196.667 -37.037 208.149 -37.037Q219.63 -37.037 227.778 -45.185Q235.926 -53.333 235.926 -64.815Z',
        d: 'M345.741 -129.63Q372.593 -129.63 391.575 -110.648Q410.556 -91.667 410.556 -64.815Q410.556 -37.963 391.575 -18.982Q372.593 0 345.741 0H290.186V-129.63ZM345.741 -37.037Q357.223 -37.037 365.371 -45.185Q373.519 -53.333 373.519 -64.815Q373.519 -76.296 365.371 -84.445Q357.223 -92.593 345.741 -92.593H327.223V-37.037Z',
        e: 'M502.408 -129.63V-92.593H465.371V-83.333H483.89V-46.296H465.371V-37.037H502.408V0H428.334V-129.63Z',
    };

    var CSS = [
        '.qc-lmark{display:flex;flex-direction:column;align-items:center;gap:10px;width:min(180px,86%)}',
        '.qc-lmark__icon{width:64px;height:64px;display:block;overflow:hidden;border-radius:16px;filter:drop-shadow(0 8px 20px color-mix(in srgb,#3b488e 26%,transparent))}',
        '.qc-lmark.is-dark .qc-lmark__icon{filter:drop-shadow(0 8px 20px rgba(0,0,0,.4))}',
        '.qc-lmark__bg{fill:#3b488e}',
        '.qc-lmark .trace-base,.qc-lmark .trace-flow{fill:none!important;stroke-linecap:round;stroke-linejoin:round}',
        '.qc-lmark .trace-base{stroke:#FFC10E;stroke-width:40}',
        '.qc-lmark .trace-flow{stroke:#FFD56A;stroke-width:40;opacity:0}',
        '.qc-lmark .pad-shape{fill:#FFC10E;stroke:none;fill-rule:evenodd}',
        '.qc-lmark .q{fill:#fff;transform-box:fill-box;transform-origin:50% 50%;opacity:0;animation:qc-lmark-q .32s ease-out forwards,qc-lmark-idle 4s .7s ease-in-out infinite}',
        '.qc-lmark.is-bare .qc-lmark__icon{width:96px;height:auto;border-radius:0;overflow:visible;filter:none}',
        '.qc-lmark.is-bare:not(.is-dark) .q{fill:#3b488e}',
        '.qc-llogo{display:block;width:min(420px,86vw)}',
        '.qc-llogo svg{width:100%;height:auto;display:block;overflow:visible}',
        '.qc-llogo .trace-base,.qc-llogo .trace-flow{fill:none!important;stroke-linecap:round;stroke-linejoin:round}',
        '.qc-llogo .trace-base{stroke:#FFC10E;stroke-width:40}',
        '.qc-llogo .trace-flow{stroke:#FFD56A;stroke-width:40;opacity:0}',
        '.qc-llogo .pad-shape{fill:#FFC10E!important;stroke:none;fill-rule:evenodd}',
        '.qc-llogo .word-code .letter{fill:#ffc10e}',
        '.qc-llogo .q,.qc-llogo .word-brackets .letter,.qc-llogo .word-uick .letter{fill:#3b488e}',
        '.qc-llogo.is-dark .q,.qc-llogo.is-dark .word-brackets .letter,.qc-llogo.is-dark .word-uick .letter{fill:#fff}',
        '.qc-llogo .q{transform-box:fill-box;transform-origin:50% 50%;opacity:0;animation:qc-llogo-q .32s ease-out forwards,qc-lmark-idle 4s .7s ease-in-out infinite}',
        '.qc-llogo .letter{transform-box:fill-box;transform-origin:50% 80%;opacity:0;animation:qc-llogo-letter .38s cubic-bezier(.2,.75,.2,1) forwards}',
        '.qc-llogo .l-lt{opacity:1;animation:none}',
        '.qc-llogo .l-slash,.qc-llogo .l-gt{animation-delay:0s}',
        '.qc-llogo .l-u{animation-delay:.38s}',
        '.qc-llogo .l-i{animation-delay:.46s}',
        '.qc-llogo .l-cu{animation-delay:.54s}',
        '.qc-llogo .l-k{animation-delay:.62s}',
        '.qc-llogo .l-cc{animation-delay:.7s}',
        '.qc-llogo .l-o{animation-delay:.78s}',
        '.qc-llogo .l-d{animation-delay:.86s}',
        '.qc-llogo .l-e{animation-delay:.94s}',
        '.qc-llogo .closer{transform-box:view-box;transform-origin:0 0;animation:qc-llogo-closer 1.5s cubic-bezier(.45,.08,.15,1) forwards}',
        '.qc-llogo.is-static .q,.qc-llogo.is-static .letter{opacity:1;animation:none}',
        '.qc-llogo.is-static .closer{animation:none;transform:translate(1307.11px,0)}',
        '@keyframes qc-llogo-q{to{opacity:1}}',
        '@keyframes qc-llogo-letter{from{opacity:0;transform:translateY(9px)}to{opacity:1;transform:translateY(0)}}',
        '@keyframes qc-llogo-closer{0%,16%{transform:translate(350px,0)}100%{transform:translate(1307.11px,0)}}',
        '@media (prefers-reduced-motion:reduce){.qc-llogo .q,.qc-llogo .letter,.qc-llogo .closer{animation:none}.qc-llogo .q,.qc-llogo .letter{opacity:1}.qc-llogo .closer{transform:translate(1307.11px,0)}}',
        '.qc-lmark__label{margin:0;max-width:16rem;font-size:12px;font-weight:500;letter-spacing:-.01em;line-height:1.35;text-align:center;color:var(--qc-text-muted,#6f7995)}',
        '.qc-lmark.is-dark .qc-lmark__label{color:#9aa0a6}',
        '@keyframes qc-lmark-q{to{opacity:1}}',
        '@keyframes qc-lmark-idle{0%,100%{transform:scale(1)}50%{transform:scale(1.015)}}',
        '@media (prefers-reduced-motion:reduce){.qc-lmark .q{animation:none;opacity:1}}',
        '.qc-brand-loader-host{position:relative;overflow:hidden}',
        '.qc-brand-loader-veil{position:absolute;inset:0;z-index:20;display:flex;align-items:center;justify-content:center;border-radius:inherit;background:rgba(248,250,252,.82);backdrop-filter:blur(8px);-webkit-backdrop-filter:blur(8px)}',
        '.qc-brand-loader-veil.is-dark{background:rgba(9,11,16,.72)}',
        '.qc-brand-loader-veil.is-page{position:fixed;z-index:1040}',
    ].join('');

    function prefersReducedMotion() {
        return typeof window !== 'undefined'
            && window.matchMedia
            && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    }

    function hideLen(len) {
        return len * 2 + 80;
    }

    function coverStroke(path, len) {
        var hide = hideLen(len);
        path.setAttribute('stroke-dasharray', len + ' ' + hide);
        path.setAttribute('stroke-dashoffset', String(hide));
        return hide;
    }

    function drawCycleTimes() {
        var drawT = 1.15;
        var gleamT = 2.2;
        var shrinkT = 1.15;
        var pauseT = 0.25;
        var cycle = drawT + gleamT * 2 + shrinkT + pauseT;
        return {
            cycle: cycle,
            tDraw: drawT / cycle,
            tGleam: (drawT + gleamT * 2) / cycle,
            tSmall: (drawT + gleamT * 2 + shrinkT * 0.82) / cycle,
            tGone: (drawT + gleamT * 2 + shrinkT) / cycle,
        };
    }

    function playDrawOnce(path, len, isFlow, delayS) {
        if (isFlow) {
            path.setAttribute('opacity', '0');
            return;
        }
        var hide = coverStroke(path, len);
        path.setAttribute('opacity', '1');
        path.animate(
            [
                { strokeDashoffset: hide },
                { strokeDashoffset: 0 },
            ],
            {
                duration: 1150,
                delay: (delayS || 0) * 1000,
                easing: 'cubic-bezier(0.2, 0.75, 0.2, 1)',
                fill: 'forwards',
                iterations: 1,
            }
        );
    }

    function playDrawCycle(path, len, isFlow, delayS) {
        var times = drawCycleTimes();
        var ms = times.cycle * 1000;
        var timing = {
            duration: ms,
            delay: (delayS || 0) * 1000,
            iterations: Infinity,
            easing: 'linear',
            fill: 'backwards',
        };
        var drawEase = 'cubic-bezier(0.2, 0.75, 0.2, 1)';
        var shrinkEase = 'cubic-bezier(0.4, 0, 0.6, 1)';
        if (isFlow) {
            path.setAttribute('stroke-dasharray', (len * 0.22) + ' ' + (len * 0.78));
            path.setAttribute('stroke-dashoffset', '0');
            path.setAttribute('opacity', '0');
            path.animate(
                [
                    { opacity: 0, strokeDashoffset: 0, offset: 0 },
                    { opacity: 0, strokeDashoffset: 0, offset: Math.max(0, times.tDraw - 0.002) },
                    { opacity: 1, strokeDashoffset: 0, offset: times.tDraw, easing: 'linear' },
                    { opacity: 1, strokeDashoffset: -2 * len, offset: times.tGleam },
                    { opacity: 0, strokeDashoffset: -2 * len, offset: Math.min(1, times.tGleam + 0.004) },
                    { opacity: 0, strokeDashoffset: 0, offset: 1 },
                ],
                timing
            );
            return;
        }
        var hide = coverStroke(path, len);
        path.setAttribute('opacity', '1');
        path.animate(
            [
                { strokeDashoffset: hide, offset: 0, easing: drawEase },
                { strokeDashoffset: 0, offset: times.tDraw, easing: 'linear' },
                { strokeDashoffset: 0, offset: times.tGleam, easing: shrinkEase },
                { strokeDashoffset: len * 0.88, offset: times.tSmall, easing: shrinkEase },
                { strokeDashoffset: hide, offset: times.tGone },
                { strokeDashoffset: hide, offset: 1 },
            ],
            timing
        );
        path.animate(
            [
                { opacity: 1, offset: 0 },
                { opacity: 1, offset: times.tDraw },
                { opacity: 1, offset: times.tGleam },
                { opacity: 0, offset: times.tGone },
                { opacity: 0, offset: 1 },
            ],
            timing
        );
    }

    function wireDefaultIcon(svg, options) {
        if (!svg) return;
        options = options || {};
        var paths = svg.querySelectorAll('.trace-base, .trace-flow');
        for (var n = 0; n < paths.length; n++) {
            var path = paths[n];
            if (path.getAnimations) {
                var running = path.getAnimations();
                for (var a = 0; a < running.length; a++) running[a].cancel();
            }
            var len = path.getTotalLength();
            var i = Math.floor(n / 2);
            var isFlow = path.classList.contains('trace-flow');
            if (prefersReducedMotion()) {
                if (isFlow) {
                    path.setAttribute('opacity', '0');
                } else {
                    path.removeAttribute('stroke-dasharray');
                    path.removeAttribute('stroke-dashoffset');
                    path.setAttribute('opacity', '1');
                }
            } else if (options.once) {
                playDrawOnce(path, len, isFlow, i * 0.12);
            } else {
                playDrawCycle(path, len, isFlow, i * 0.12);
            }
        }
    }

    function unwindDefaultIcon(svg) {
        if (!svg) return;
        var paths = svg.querySelectorAll('.trace-base, .trace-flow');
        for (var n = 0; n < paths.length; n++) {
            var path = paths[n];
            if (path.getAnimations) {
                var running = path.getAnimations();
                for (var a = 0; a < running.length; a++) running[a].cancel();
            }
        }
    }

    function injectStyles() {
        if (typeof document === 'undefined') return;
        var existing = document.getElementById('qc-brand-loader-css');
        if (existing && existing.parentNode) existing.parentNode.removeChild(existing);
        var style = document.createElement('style');
        style.id = 'qc-brand-loader-css';
        style.textContent = CSS;
        document.head.appendChild(style);
    }

    function escapeHtml(value) {
        return String(value || '')
            .replace(/&/g, '&amp;')
            .replace(/</g, '&lt;')
            .replace(/>/g, '&gt;')
            .replace(/"/g, '&quot;');
    }

    function buildMarkup(uid, label, size, framed) {
        var clipId = 'qc-load-clip-' + uid;
        var maskId = 'qc-load-mask-' + uid;
        var glowId = 'qc-load-glow-' + uid;
        var px = Number(size) || 64;
        var holes = '';
        var i;
        framed = framed !== false;
        for (i = 0; i < ICON_PADS.length; i++) {
            holes += '<circle cx="' + ICON_PADS[i].x + '" cy="' + ICON_PADS[i].y + '" r="22.1" fill="black"/>';
        }
        var traces = '';
        for (i = 0; i < ICON_TRACES.length; i++) {
            traces +=
                '<g class="circuit c' + (i + 1) + '">' +
                '<path class="trace-base t' + (i + 1) + '" opacity="0" d="' + ICON_TRACES[i] + '"/>' +
                '<path class="trace-flow t' + (i + 1) + '" d="' + ICON_TRACES[i] + '" style="filter:url(#' + glowId + ')"/>' +
                '</g>';
        }
        var pads = '';
        for (i = 0; i < CIRCUIT_PADS.length; i++) {
            if (!CIRCUIT_PADS[i]) continue;
            pads += '<g class="pad"><path class="pad-shape" fill-rule="evenodd" d="' + CIRCUIT_PADS[i].d + '"/></g>';
        }
        var labelHtml = label
            ? '<span class="qc-lmark__label">' + escapeHtml(label) + '</span>'
            : '';
        var art =
            '<g class="traces" mask="url(#' + maskId + ')">' + traces + '</g>' +
            '<g class="pads">' + pads + '</g>' +
            '<path class="q" fill-rule="evenodd" d="' + ICON_Q + '"/>';
        var defs =
            '<defs>' +
            '<filter id="' + glowId + '" x="-40%" y="-40%" width="180%" height="180%">' +
            '<feGaussianBlur stdDeviation="8" result="b"/>' +
            '<feMerge><feMergeNode in="b"/><feMergeNode in="SourceGraphic"/></feMerge>' +
            '</filter>' +
            (framed ? '<clipPath id="' + clipId + '"><rect width="1024" height="1024" rx="224"/></clipPath>' : '') +
            '<mask id="' + maskId + '" maskUnits="userSpaceOnUse">' +
            '<rect x="0" y="0" width="947" height="586" fill="white"/>' + holes +
            '</mask></defs>';
        var svgInner = framed
            ? defs + '<g clip-path="url(#' + clipId + ')"><rect class="qc-lmark__bg" width="1024" height="1024" rx="224"/><g class="logo-art" transform="translate(40 280) scale(1)">' + art + '</g></g>'
            : defs + '<g class="logo-art">' + art + '</g>';
        var view = framed ? '0 0 1024 1024' : '0 0 947 586';
        var sizeStyle = framed
            ? 'width:' + px + 'px;height:' + px + 'px'
            : 'width:' + px + 'px;height:auto';
        var cls = 'qc-lmark' + (prefersReducedMotion() ? ' is-static' : '') + (framed ? '' : ' is-bare');
        return (
            '<div class="' + cls + '" role="status" aria-label="' + escapeHtml(label || 'Loading') + '">' +
            '<svg class="qc-lmark__icon" viewBox="' + view + '" aria-hidden="true" style="' + sizeStyle + '">' +
            svgInner + '</svg>' + labelHtml + '</div>'
        );
    }

    function letterPath(cls, d) {
        return '<path class="letter ' + cls + '" fill-rule="evenodd" d="' + d + '"/>';
    }

    function buildLogoMarkup(uid) {
        var maskId = 'qc-logo-mask-' + uid;
        var glowId = 'qc-logo-glow-' + uid;
        var holes = '';
        var i;
        for (i = 0; i < LOGO_PADS.length; i++) {
            holes += '<circle cx="' + LOGO_PADS[i].x + '" cy="' + LOGO_PADS[i].y + '" r="25.1" fill="black"/>';
        }
        var traces = '';
        for (i = 0; i < LOGO_TRACES.length; i++) {
            traces +=
                '<g class="circuit c' + (i + 1) + '">' +
                '<path class="trace-base t' + (i + 1) + '" opacity="0" d="' + LOGO_TRACES[i] + '"/>' +
                '<path class="trace-flow t' + (i + 1) + '" d="' + LOGO_TRACES[i] + '"/>' +
                '</g>';
        }
        var pads = '';
        for (i = 0; i < LOGO_CIRCUIT_PADS.length; i++) {
            if (!LOGO_CIRCUIT_PADS[i]) continue;
            pads += '<g class="pad"><path class="pad-shape" fill-rule="evenodd" d="' + LOGO_CIRCUIT_PADS[i].d + '"/></g>';
        }
        var staticCls = prefersReducedMotion() ? ' is-static' : '';
        return (
            '<div class="qc-llogo' + staticCls + '" role="img" aria-label="QuickCode">' +
            '<svg class="qc-llogo__mark" viewBox="8 -24 6753 781" aria-hidden="true">' +
            '<defs>' +
            '<filter id="' + glowId + '" x="-40%" y="-40%" width="180%" height="180%">' +
            '<feGaussianBlur stdDeviation="8" result="b"/>' +
            '<feMerge><feMergeNode in="b"/><feMergeNode in="SourceGraphic"/></feMerge></filter>' +
            '<mask id="' + maskId + '" maskUnits="userSpaceOnUse">' +
            '<rect x="0" y="0" width="6655" height="752" fill="white"/>' + holes +
            '</mask></defs>' +
            '<g class="logo-art">' +
            '<g class="circuit">' +
            '<g class="traces" mask="url(#' + maskId + ')">' + traces + '</g>' +
            '<g class="pads">' + pads + '</g>' +
            '<path class="q" fill-rule="evenodd" d="' + LOGO_Q + '"/>' +
            '</g>' +
            '<g class="word word-brackets" transform="matrix(' + LOGO_TM + ' -1.28770953200092 627.303653495917)">' +
            letterPath('l-lt', LOGO_WORD.lt) +
            '<g class="closer" transform="translate(350 0)">' +
            letterPath('l-slash', LOGO_WORD.slash) +
            letterPath('l-gt', LOGO_WORD.gt) +
            '</g></g>' +
            '<g class="word word-uick" transform="matrix(' + LOGO_TM + ' 1555.04214710889 628.586390994723)">' +
            letterPath('l-u', LOGO_WORD.u) +
            letterPath('l-i', LOGO_WORD.i) +
            letterPath('l-cu', LOGO_WORD.cu) +
            letterPath('l-k', LOGO_WORD.k) +
            '</g>' +
            '<g class="word word-code" transform="matrix(' + LOGO_TM + ' 3494.37563694772 642.76267775816)">' +
            letterPath('l-cc', LOGO_WORD.cc) +
            letterPath('l-o', LOGO_WORD.o) +
            letterPath('l-d', LOGO_WORD.d) +
            letterPath('l-e', LOGO_WORD.e) +
            '</g></g></svg></div>'
        );
    }

    function mount(el, options) {
        if (!el) return null;
        injectStyles();
        unmount(el);
        options = options || {};
        var uid = 'qcl' + (++seq);
        el.setAttribute('data-qc-brand-loader', uid);
        if (options.kind === 'logo') {
            el.innerHTML = buildLogoMarkup(uid);
            var logo = el.querySelector('.qc-llogo');
            if (options.dark && logo) logo.classList.add('is-dark');
            wireDefaultIcon(el.querySelector('svg.qc-llogo__mark'), options);
            return el;
        }
        el.innerHTML = buildMarkup(uid, options.label || '', options.size || 64, options.framed);
        var root = el.querySelector('.qc-lmark');
        if (options.dark && root) root.classList.add('is-dark');
        wireDefaultIcon(el.querySelector('svg.qc-lmark__icon'), options);
        return el;
    }

    function unmount(el) {
        if (!el || !el.querySelector) return;
        unwindDefaultIcon(el.querySelector('svg.qc-lmark__icon, svg.qc-llogo__mark'));
        if (el.getAttribute && el.getAttribute('data-qc-brand-loader')) {
            el.removeAttribute('data-qc-brand-loader');
            el.innerHTML = '';
        }
    }

    function showOverlay(host, options) {
        if (!host) return null;
        hideOverlay(host);
        injectStyles();
        options = options || {};
        var veil = document.createElement('div');
        veil.className = 'qc-brand-loader-veil' + (options.dark ? ' is-dark' : '') + (options.page ? ' is-page' : '');
        veil.setAttribute('role', 'status');
        veil.setAttribute('aria-live', 'polite');
        veil.setAttribute('aria-busy', 'true');
        if (options.page) {
            document.body.appendChild(veil);
        } else {
            host.classList.add('qc-brand-loader-host');
            host.appendChild(veil);
        }
        host._qcBrandLoaderVeil = veil;
        mount(veil, options);
        return veil;
    }

    function hideOverlay(host) {
        if (!host || !host._qcBrandLoaderVeil) return;
        var veil = host._qcBrandLoaderVeil;
        unmount(veil);
        if (veil.parentNode) veil.parentNode.removeChild(veil);
        host._qcBrandLoaderVeil = null;
        if (host.classList) host.classList.remove('qc-brand-loader-host');
    }

    function mountLogo(el, options) {
        options = options || {};
        options.kind = 'logo';
        if (options.once == null) options.once = true;
        return mount(el, options);
    }

    root.QcBrandLoader = {
        mount: mount,
        mountLogo: mountLogo,
        unmount: unmount,
        showOverlay: showOverlay,
        hideOverlay: hideOverlay,
        wire: wireDefaultIcon,
        unwind: unwindDefaultIcon,
    };
})(typeof window !== 'undefined' ? window : this);
