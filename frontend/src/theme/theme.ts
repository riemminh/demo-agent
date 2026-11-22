import type { ThemeConfig } from "antd";

// Design tokens tập trung (Plan V2 mục 5.1). Sửa màu/font ở đây, không rải CSS trong page.
export const MONO_FONT = "ui-monospace, SFMono-Regular, Menlo, Consolas, monospace";

export const playgroundTheme: ThemeConfig = {
  token: {
    colorPrimary: "#2459A6",
    colorInfo: "#2459A6",
    colorSuccess: "#087F76",
    colorSuccessBg: "#EAF6F4", // Nền "Kết quả cần đạt": sáng để chữ dễ đọc khi trình chiếu.
    colorSuccessBorder: "#9ED2CA",
    colorWarning: "#B45309",
    colorError: "#B42318",
    colorText: "#172033",
    colorBorder: "#DCE3EC",
    colorBorderSecondary: "#E6EBF1",
    colorBgLayout: "#F6F8FB",
    borderRadius: 8,
    fontSize: 15, // Đủ lớn khi trình chiếu.
    fontFamilyCode: MONO_FONT,
  },
  components: {
    Layout: { headerBg: "#172033", siderBg: "#FFFFFF", headerPadding: "0 24px" },
  },
};
