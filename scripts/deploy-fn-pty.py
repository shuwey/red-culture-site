#!/usr/bin/env python3
# ============================================================
# deploy-fn-pty.py — 云函数一键部署（封装已验证的 delete+recreate pty 配方）
# 每个函数：先 sync-shared 确保 lib 副本最新 → tcb fn delete（喂 y）→
#           tcb fn deploy --dir（喂 \n 选默认菜单项）。
# 依赖 Python 标准库 pty/select，无需额外依赖。必须在项目根目录运行以读 cloudbaserc.json。
# ============================================================
import os, pty, select, sys, time

TCB = "/Users/shuwei/.workbuddy/binaries/node/cli-connector-packages/bin/tcb"
ENV = "cloud1-d0g0aq0bl2cfbcbdf"
PROJECT = "/Users/shuwei/WorkBuddy/2026-08-23-20-29-48/red-culture-site"
FUNCS = ["ai-chat", "quiz-rank"]

def run(cmd, label):
    os.chdir(PROJECT)
    print("\n##### RUN:", label, "#####")
    pid, fd = pty.fork()
    if pid == 0:
        os.execvp(cmd[0], cmd)
    else:
        last = time.time()
        while True:
            r, _, _ = select.select([fd], [], [], 1.0)
            if r:
                try:
                    data = os.read(fd, 4096)
                except OSError:
                    break
                if not data:
                    break
                sys.stdout.write(data.decode(errors="replace"))
                sys.stdout.flush()
                text = data.decode(errors="replace").lower()
                if "overwrite" in text or "(y/n)" in text or "y/n" in text:
                    os.write(fd, b"y\n")
                if "please select an action" in text or "select an action" in text:
                    os.write(fd, b"\n")
                last = time.time()
            else:
                if time.time() - last > 180:
                    break
        try:
            os.waitpid(pid, 0)
        except Exception:
            pass

# 0) 同步敏感词库副本（确保 lib/ 为最新）
run([sys.executable, os.path.join(PROJECT, "scripts", "sync-shared.js")], "sync-shared")

for fn in FUNCS:
    run([TCB, "fn", "delete", fn, "-e", ENV], f"DELETE {fn}")
    run([TCB, "fn", "deploy", fn, "--dir", f"cloudfunctions/{fn}", "-e", ENV], f"DEPLOY {fn}")

print("\n✔ 云函数部署完成：", ", ".join(FUNCS))
