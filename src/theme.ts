import type { ThemeConfig } from "antd";

/* Ant Design reads its theme from styles/tokens.css, so colors live in one place */
export function buildTheme(): ThemeConfig {
    const css = getComputedStyle(document.documentElement);
    const v = (name: string) => css.getPropertyValue(name).trim();
    const px = (name: string) => parseInt(v(name), 10);

    return {
        token: {
            colorPrimary: v("--primary"),
            colorLink: v("--primary"),
            colorText: v("--foreground"),
            colorTextSecondary: v("--muted-foreground"),
            colorTextDescription: v("--muted-foreground"),
            colorTextPlaceholder: v("--muted-foreground"),
            colorBorder: v("--input"),
            colorBorderSecondary: v("--border"),
            colorBgContainer: v("--card"),
            colorBgElevated: v("--card"),
            colorError: v("--danger"),
            colorSuccess: v("--success"),
            colorWarning: v("--warning"),
            fontFamily: v("--font"),
            fontFamilyCode: v("--mono"),
            fontSize: px("--text-md"),
            borderRadius: px("--r-md"),
            borderRadiusLG: px("--r-lg"),
            borderRadiusSM: px("--r-sm"),
            controlHeight: px("--control"),
            controlHeightLG: px("--control-lg"),
            controlHeightSM: px("--control-sm"),
            motionDurationMid: "0.18s",
        },
        components: {
            Button: {
                fontWeight: 600,
                primaryShadow: "none",
                defaultShadow: "none",
                dangerShadow: "none",
                paddingInlineLG: 22,
            },
            Segmented: {
                trackBg: v("--muted"),
                itemSelectedBg: v("--card"),
                trackPadding: 3,
            },
            Modal: {
                borderRadiusLG: px("--r-xl"),
            },
            Tooltip: {
                colorBgSpotlight: v("--foreground"),
            },
        },
    };
}
