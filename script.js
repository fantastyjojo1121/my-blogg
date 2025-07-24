// Firebase 초기화
const firebaseConfig = {
  apiKey: "AIzaSyBJcdO1Iz42-sj19f3X43JRecK2dZHM8XM",
  authDomain: "my-blogg-25c16.firebaseapp.com",
  databaseURL: "https://my-blogg-25c16-default-rtdb.asia-southeast1.firebasedatabase.app",
  projectId: "my-blogg-25c16",
  storageBucket: "my-blogg-25c16.appspot.com",
  messagingSenderId: "430693541995",
  appId: "1:430693541995:web:abdcdcf3e5b9331fc4a92e"
};
firebase.initializeApp(firebaseConfig);
const db = firebase.database();

document.addEventListener("DOMContentLoaded", () => {
  const get = id => document.getElementById(id);
  const posts = get("posts");

  let userDB = JSON.parse(localStorage.getItem("userDB")) || { 관리자: "0000" };
  let userData = JSON.parse(localStorage.getItem("userData")) || {};
  let currentUser = localStorage.getItem("currentUser");
  if (!currentUser) {
    currentUser = "guest_" + Math.random().toString(36).substring(2, 8);
    localStorage.setItem("currentUser", currentUser);
  }
  let isAdmin = currentUser === "관리자";

  const updateStorage = () => {
    localStorage.setItem("userDB", JSON.stringify(userDB));
    localStorage.setItem("userData", JSON.stringify(userData));
    localStorage.setItem("currentUser", currentUser);
    localStorage.setItem("isAdmin", JSON.stringify(isAdmin));
  };

  const clearForm = () => {
    get("post-content").value = "";
    get("post-media").value = "";
  };

  const updateUserData = (content) => {
    userData[currentUser] ||= { postCount: 0, recentPost: "" };
    userData[currentUser].postCount++;
    userData[currentUser].recentPost = content;
    updateStorage();
  };

  const loadPosts = () => {
    db.ref("posts").on("value", snapshot => {
      posts.innerHTML = "";
      const data = snapshot.val();
      if (!data) return;
      Object.entries(data).reverse().forEach(([key, post]) => {
        const div = document.createElement("div");
        div.className = "post";
        let html = `<p><strong>${post.author}</strong> (${post.date})</p><p>${post.content}</p>`;
        if (post.file) {
          if (post.file.type.startsWith("image/")) {
            html += `<img src="${post.file.url}" alt="image">`;
          } else if (post.file.type.startsWith("video/")) {
            html += `<video src="${post.file.url}" controls></video>`;
          }
        }
        div.innerHTML = html;

        if (isAdmin) {
          const del = document.createElement("button");
          del.textContent = "삭제";
          del.className = "delete-post";
          del.onclick = () => {
            if (confirm("정말 삭제하시겠습니까?")) {
              db.ref("posts/" + key).remove();
            }
          };
          div.appendChild(del);
        }

        posts.appendChild(div);
      });
    });
  };

  // 초기 화면
  get("main-page").classList.remove("hidden");
  get("board-page").classList.add("hidden");
  get("show-login").textContent = currentUser.startsWith("guest_") ? "🔐 로그인" : `🔓 ${currentUser}`;
  if (!currentUser.startsWith("guest_")) loadPosts();

  // 페이지 이동
  get("go-to-board").onclick = () => {
    get("main-page").classList.add("hidden");
    get("board-page").classList.remove("hidden");
    loadPosts();
  };

  // 팝업 닫기
  document.querySelectorAll(".close").forEach(btn => {
    btn.onclick = () => {
      document.getElementById(btn.dataset.target).classList.add("hidden");
    };
  });

  // 로그인 팝업
  get("show-login").onclick = () => get("login-popup").classList.remove("hidden");

  // 비밀번호 눈모양
  const pwInput = get("login-password");
  const toggle = document.createElement("span");
  toggle.textContent = "👁️";
  toggle.style.cursor = "pointer";
  toggle.onclick = () => {
    pwInput.type = pwInput.type === "password" ? "text" : "password";
  };
  pwInput.parentNode.insertBefore(toggle, pwInput.nextSibling);

  // 로그인
  get("login-btn").onclick = () => {
    const u = get("login-username").value.trim();
    const p = get("login-password").value.trim();
    if (!u || !p) return alert("입력하세요.");
    if (!userDB[u]) return alert("회원가입 먼저 해주세요.");
    if (userDB[u] !== p) return alert("비밀번호 오류.");

    currentUser = u;
    isAdmin = u === "관리자";
    userData[u] ||= { postCount: 0, recentPost: "" };
    updateStorage();
    get("login-popup").classList.add("hidden");
    get("show-login").textContent = `🔓 ${currentUser}`;
    alert(`${currentUser}님 환영합니다!`);
    loadPosts();
  };

  // 회원가입
  get("register-btn").onclick = () => {
    const u = get("login-username").value.trim();
    const p = get("login-password").value.trim();
    if (!u || !p) return alert("입력하세요.");
    if (userDB[u]) return alert("이미 존재하는 아이디입니다.");
    userDB[u] = p;
    userData[u] = { postCount: 0, recentPost: "" };
    alert("회원가입 완료!");
    updateStorage();
  };

  // 게시글 작성
  get("submit-post").onclick = () => {
    const content = get("post-content").value.trim();
    const file = get("post-media").files[0];
    if (!content && !file) return alert("내용 또는 파일 필요");

    const now = new Date().toLocaleString();
    const post = {
      author: currentUser,
      content,
      date: now,
      file: null
    };

    if (file) {
      const reader = new FileReader();
      reader.onload = e => {
        post.file = {
          url: e.target.result,
          type: file.type
        };
        db.ref("posts").push(post);
        updateUserData(content);
        clearForm();
      };
      reader.readAsDataURL(file);
    } else {
      db.ref("posts").push(post);
      updateUserData(content);
      clearForm();
    }
  };

  // 내 정보 보기
  get("show-profile").onclick = () => {
    const data = userData[currentUser] || { postCount: 0, recentPost: "" };
    get("profile-name").textContent = `이름: ${currentUser}`;
    get("profile-post-count").textContent = `총 게시글 수: ${data.postCount}`;
    get("recent-post").textContent = `최근 게시글 내용: ${data.recentPost || "없음"}`;
    get("view-users-btn").classList.toggle("hidden", !isAdmin);
    get("profile-popup").classList.remove("hidden");
  };

  // 가입자 보기
  get("view-users-btn").onclick = () => {
    const ul = get("user-list");
    ul.innerHTML = "";
    Object.keys(userDB).forEach(u => {
      const li = document.createElement("li");
      li.textContent = u;
      ul.appendChild(li);
    });
    get("user-list-popup").classList.remove("hidden");
  };

  // 로그아웃
  get("logout-btn").onclick = () => {
    currentUser = "guest_" + Math.random().toString(36).substring(2, 8);
    isAdmin = false;
    get("profile-popup").classList.add("hidden");
    get("show-login").textContent = "🔐 로그인";
    updateStorage();
    loadPosts();
  };
});
