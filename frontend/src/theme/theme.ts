import { theme, type ThemeConfig } from "antd";

// Design tokens tập trung (Plan V2 mục 5.1). Sửa màu/font ở đây, không rải CSS trong page.
export const MONO_FONT = "ui-monospace, SFMono-Regular, Menlo, Consolas, monospace";

// Dark theme: darkAlgorithm tự sinh nền, chữ, border, *Bg/*Border từ seed color.
// Chỉ khai báo seed (màu thương hiệu); không ghi đè colorText/colorBg* để tránh lệch với nền tối.
export const playgroundTheme: ThemeConfig = {
  algorithm: theme.darkAlgorithm,
  token: {
    colorPrimary: "#3B7DD8",
    colorInfo: "#3B7DD8",
    colorSuccess: "#14A89C",
    colorWarning: "#D98A1E",
    colorError: "#E5484D",
    borderRadius: 8,
    fontSize: 15, // Đủ lớn khi trình chiếu.
    fontFamilyCode: MONO_FONT,
  },
  components: {
    // Header và Sider cùng màu colorBgContainer của dark theme (#141414) để khớp nền Menu.
    Layout: { headerBg: "#141414", siderBg: "#141414", headerPadding: "0 24px" },
  },
};
