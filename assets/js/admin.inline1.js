
      var ENV = "cloud1-d0g0aq0bl2cfbcbdf";
      var TOKEN = sessionStorage.getItem("rcs_admin_token") || "";

      function app() {
        return window.cloudbase.init({ env: ENV });
      }
      async function callAdmin(action, extra) {
        var data = Object.assign({ action: action, adminToken: TOKEN }, extra || {});
        var res = await app().callFunction({ name: "admin", data: data });
        return res.result;
      }

      function show(elId, show) {
        var e = document.getElementById(elId);
        if (e) e.classList.toggle("hidden", !show);
      }

      /* 登录 */
      async function doLogin() {
        var v = document.getElementById("tokenInput").value.trim();
        if (!v) return;
        TOKEN = v;
        sessionStorage.setItem("rcs_admin_token", TOKEN);
        var r = await callAdmin("ping");
        if (r && r.success) {
          show("loginBox", false);
          show("mainBox", true);
          loadWords();
          loadCorrections();
        } else {
          var err = document.getElementById("loginErr");
          err.textContent = "令牌无效或未配置，请检查。";
          err.classList.remove("hidden");
          TOKEN = "";
          sessionStorage.removeItem("rcs_admin_token");
        }
      }
      document.getElementById("loginBtn").onclick = doLogin;

      /* 敏感词 */
      async function loadWords() {
        var r = await callAdmin("word.list");
        var tbody = document.querySelector("#wordTable tbody");
        tbody.innerHTML = "";
        if (!r || !r.success) return;
        (r.data.items || []).forEach(function (it) {
          var tr = document.createElement("tr");
          var statusTag =
            it.status === "active"
              ? '<span class="tag tag-active">active</span>'
              : '<span class="tag tag-pending">pending</span>';
          var ops = "";
          if (it.status === "pending") {
            ops +=
              '<button class="btn-sm btn-ok" data-act="approve" data-id="' +
              it._id +
              '">通过</button> ';
          }
          ops +=
            '<button class="btn-sm btn-warn" data-act="reject" data-id="' +
            it._id +
            '">拒绝</button> ';
          ops +=
            '<button class="btn-sm btn-danger" data-act="delete" data-id="' +
            it._id +
            '">删除</button>';
          tr.innerHTML =
            "<td>" + esc(it.word) + "</td><td>" + esc(it.category || "") + "</td><td>" +
            statusTag + "</td><td>" + ops + "</td>";
          tbody.appendChild(tr);
        });
      }
      async function addWord() {
        var w = document.getElementById("newWord").value.trim();
        var c = document.getElementById("newWordCat").value.trim();
        if (!w) return;
        await callAdmin("word.add", { word: w, category: c });
        document.getElementById("newWord").value = "";
        loadWords();
      }
      document.getElementById("addWordBtn").onclick = addWord;
      window.approveWord = async function (id) {
        await callAdmin("word.approve", { id: id });
        loadWords();
      };
      window.rejectWord = async function (id) {
        await callAdmin("word.reject", { id: id });
        loadWords();
      };
      window.deleteWord = async function (id) {
        if (!confirm("确认删除该敏感词？")) return;
        await callAdmin("word.delete", { id: id });
        loadWords();
      };

      /* 事件委托：敏感词操作按钮（tbody 持久，重渲染不丢监听，免内联 onclick） */
      document.querySelector("#wordTable tbody").addEventListener("click", function (e) {
        var btn = e.target.closest("button[data-act]");
        if (!btn) return;
        var id = btn.getAttribute("data-id");
        var act = btn.getAttribute("data-act");
        if (act === "approve") approveWord(id);
        else if (act === "reject") rejectWord(id);
        else if (act === "delete") deleteWord(id);
      });

      /* 纠错 */
      async function loadCorrections() {
        var f = document.getElementById("corrFilter").value;
        var r = await callAdmin("correction.list", f ? { status: f } : {});
        var tbody = document.querySelector("#corrTable tbody");
        tbody.innerHTML = "";
        if (!r || !r.success) return;
        (r.data.items || []).forEach(function (it) {
          var tr = document.createElement("tr");
          var st =
            it.status === "resolved"
              ? '<span class="tag tag-resolved">已处理</span>'
              : it.status === "rejected"
              ? '<span class="tag tag-rejected">已驳回</span>'
              : '<span class="tag tag-pending">待处理</span>';
          var ops =
            '<button class="btn-sm btn-ok" data-act="handle" data-status="resolved" data-id="' +
            it._id +
            '">已处理</button> ' +
            '<button class="btn-sm btn-danger" data-act="handle" data-status="rejected" data-id="' +
            it._id +
            '">驳回</button>';
          tr.innerHTML =
            "<td>" + esc(it.contentType || "") + "</td><td>" + esc(it.quote || "") +
            "</td><td>" + esc(it.description || "") + (it.handleNote ? "<br><span class='muted'>处理意见：" + esc(it.handleNote) + "</span>" : "") +
            "</td><td>" + esc(it.contact || "") + "</td><td>" + st + "</td><td>" + ops + "</td>";
          tbody.appendChild(tr);
        });
      }
      window.handleCorr = async function (id, status) {
        var note = prompt("处理意见（选填）：", "");
        await callAdmin("correction.handle", { id: id, status: status, handleNote: note || "" });
        loadCorrections();
      };

      /* 事件委托：纠错操作按钮 */
      document.querySelector("#corrTable tbody").addEventListener("click", function (e) {
        var btn = e.target.closest("button[data-act]");
        if (!btn) return;
        var id = btn.getAttribute("data-id");
        var status = btn.getAttribute("data-status");
        handleCorr(id, status);
      });
      document.getElementById("corrRefresh").onclick = loadCorrections;
      document.getElementById("corrFilter").onchange = loadCorrections;

      /* tabs */
      document.querySelectorAll(".tab").forEach(function (t) {
        t.onclick = function () {
          document.querySelectorAll(".tab").forEach(function (x) { x.classList.remove("active"); });
          t.classList.add("active");
          var tab = t.getAttribute("data-tab");
          show("tab-words", tab === "words");
          show("tab-corrections", tab === "corrections");
        };
      });

      function esc(s) {
        return String(s == null ? "" : s).replace(/[&<>"']/g, function (c) {
          return { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c];
        });
      }

      /* 已登录则直接进入 */
      if (TOKEN) {
        callAdmin("ping").then(function (r) {
          if (r && r.success) {
            show("loginBox", false);
            show("mainBox", true);
            loadWords();
            loadCorrections();
          }
        });
      }
    