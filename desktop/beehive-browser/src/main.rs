// 隐藏 Windows 控制台窗口（无条件，release 和 debug 都隐藏）
// 注意：必须在文件最顶部，在其它所有代码之前
#![windows_subsystem = "windows"]

fn main() {
    beehive_browser_lib::run()
}
