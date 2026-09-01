
    (function () {
      var form = document.getElementById("rcs-contact-form");
      var err = document.getElementById("rcs-c-error");
      if (!form) return;
      form.addEventListener("submit", function (e) {
        e.preventDefault();
        err.textContent = "";
        var name = document.getElementById("rcs-c-name").value.trim();
        var email = document.getElementById("rcs-c-email").value.trim();
        var msg = document.getElementById("rcs-c-msg").value.trim();
        if (!name) { err.textContent = "请填写您的称呼。"; return; }
        if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) { err.textContent = "请填写有效的邮箱地址。"; return; }
        if (!msg) { err.textContent = "请填写联系内容。"; return; }
        var subject = encodeURIComponent("红色文化传播网 · 访客联系（" + name + "）");
        var body = encodeURIComponent("称呼：" + name + "\n邮箱：" + email + "\n\n联系内容：\n" + msg);
        window.location.href = "mailto:red-culture-feedback@example.com?subject=" + subject + "&body=" + body;
        err.style.color = "#1B7A3D";
        err.textContent = "已为您唤起邮件客户端，请发送邮件完成提交。感谢您的反馈！";
      });
    })();
  