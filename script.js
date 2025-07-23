// Firebase 초기화
const firebaseConfig = {
  apiKey: "AIzaSyBJcdO1Iz42-sj19f3X43JRecK2dZHM8XM",
  authDomain: "my-blogg-25c16.firebaseapp.com",
  databaseURL: "https://my-blogg-25c16-default-rtdb.firebaseio.com",
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
  let userData = JSON.parse(localStorage.getItem("userData")) || { guest: { postCount: 0, recentPost: "" } };
  let currentUser = localStorage.getItem("currentUser") || "guest";
  let isAdmin = currentUser === "관리자";

  const updateStorage = () => {
    localStorage.setItem("userDB", JSON.stringify(userDB));
    localStorage.setItem("userData", JSON.stringify(userData));
    localStorage.setItem("currentUser", currentUser);
    localStorage.setItem("isAdmin", JSON.stringify(isAdmin));
  };

  function loadPosts() {
    db.ref("posts").on("value", snapshot => {
      posts.innerHTML = "";
      const data = snapshot.val();
      if (!data) return;
      Object.entries(data).reverse().forEach(([key, post]) => {
        const postDiv = document.createElement("div");
        postDiv.className = "post";

        let html = `<p><strong>${post.author}</strong> (${post.date})</p><p>${post.content}</p>`;
        if (post.file) {
          if (post.file.type.startsWith("image/")) {
            html += `<img src="${post.file.url}" alt="image">`;
          } else if (post.file.type.startsWith("video/")) {
            html += `<video src="${post.file.url}" controls></video>`;
          }
        }

        postDiv.innerHTML = html;

        if (isAdmin) {
          const delBtn = document.createElement("button");
          delBtn.textContent = "삭제";
          delBtn.style.position = "absolute";
          delBtn.style.top = "10px";
          delBtn.style.right = "10px";
          delBtn.addEventListener("click", () => {
            if (confirm("정말 삭제하시겠습니까?")) {
              db.ref("posts/" + key).remove();
            }
          });
          postDiv.appendChild(delBtn);
        }

        posts.appendChild(postDiv);
      });
    });
  }

  // 페이지 전환
  get("go-to-board").onclick = () => {
    get("main-page").classList.add("hidden");
    get("board-page").classList.remove("hidden");
    get("show-login").textContent = currentUser === "guest" ? "🔐 로그인" : `🔓 ${currentUser}`;
    loadPosts();
  };

  // 팝업 닫기
  document.querySelectorAll(".close").forEach(btn => {
    btn.onclick = () => {
      const popupId = btn.getAttribute("data-target");
      document.getElementById(popupId).classList.add("hidden");
    };
  });

  // 로그인 팝업 열기
  get("show-login").onclick = () => {
    if (currentUser === "guest") {
      get("login-popup").classList.remove("hidden");
    } else {
      alert(`${currentUser}님은 이미 로그인 상태입니다.`);
    }
  };

  // 비밀번호 보기/숨기기
  const pw = get("login-password");
  const toggle = document.getElementById("toggle-password");
  if (toggle) {
    toggle.addEventListener("click", () => {
      pw.type = pw.type === "password" ? "text" : "password";
    });
  }

  // 로그인
  get("login-btn").onclick = () => {
    const username = get("login-username").value.trim();
    const password = get("login-password").value.trim();

    if (!username || !password) {
      alert("아이디와 비밀번호를 입력하세요.");
      return;
    }

    if (userDB[username] && userDB[username] === password) {
      currentUser = username;
      isAdmin = currentUser === "관리자";
      userData[currentUser] ||= { postCount: 0, recentPost: "" };
      updateStorage();
      alert(`${currentUser}님 환영합니다!`);
      get("login-popup").classList.add("hidden");
      get("show-login").textContent = `🔓 ${currentUser}`;
      loadPosts();
    } else {
      alert("아이디 또는 비밀번호가 올바르지 않습니다.");
    }
  };

  // 회원가입
  get("register-btn").onclick = () => {
    const username = get("login-username").value.trim();
    const password = get("login-password").value.trim();

    if (!username || !password) {
      alert("아이디와 비밀번호를 모두 입력하세요.");
      return;
    }
    if (userDB[username]) {
      alert("이미 존재하는 아이디입니다.");
      return;
    }
    userDB[username] = password;
    userData[username] = { postCount: 0, recentPost: "" };
    updateStorage();
    alert("회원가입 완료! 로그인 해주세요.");
  };

  // 게시글 작성
  get("submit-post").onclick = () => {
    if (currentUser === "guest") {
      alert("로그인 후 글을 작성하세요.");
      return;
    }
    const content = get("post-content").value.trim();
    const fileInput = get("post-media");
    const now = new Date().toLocaleString();

    if (!content && fileInput.files.length === 0) {
      alert("내용이나 파일을 입력해주세요.");
      return;
    }

    const newPost = {
      author: currentUser,
      content,
      date: now,
      file: null
    };

    if (fileInput.files.length > 0) {
      const file = fileInput.files[0];
      const reader = new FileReader();
      reader.onload = e => {
        newPost.file = {
          url: e.target.result,
          type: file.type
        };
        db.ref("posts").push(newPost);
        updateUserData(content);
        clearPostForm();
      };
      reader.readAsDataURL(file);
    } else {
      db.ref("posts").push(newPost);
      updateUserData(content);
      clearPostForm();
    }
  };

  function updateUserData(content) {
    userData[currentUser] ||= { postCount: 0, recentPost: "" };
    userData[currentUser].postCount++;
    userData[currentUser].recentPost = content;
    updateStorage();
  }

  function clearPostForm() {
    get("post-content").value = "";
    get("post-media").value = "";
  }

  // 내 정보 보기
  get("show-profile").onclick = () => {
    if (currentUser === "guest") {
      alert("로그인 후 이용 가능합니다.");
      return;
    }
    get("profile-name").textContent = `이름: ${currentUser}`;
    get("profile-post-count").textContent = `게시글 수: ${userData[currentUser]?.postCount || 0}`;
    get("recent-post").textContent = `최근 글: ${userData[currentUser]?.recentPost || "없음"}`;
    get("profile-popup").classList.remove("hidden");

    get("view-users-btn").classList.toggle("hidden", !isAdmin);
  };

  // 가입자 목록 보기
  get("view-users-btn").onclick = () => {
    const list = get("user-list");
    list.innerHTML = "";
    Object.keys(userDB).forEach(user => {
      const li = document.createElement("li");
      li.textContent = user;
      list.appendChild(li);
    });
    get("user-list-popup").classList.remove("hidden");
  };

  // 로그아웃
  get("logout-btn").onclick = () => {
    currentUser = "guest";
    isAdmin = false;
    updateStorage();
    get("profile-popup").classList.add("hidden");
    get("show-login").textContent = "🔐 로그인";
    alert("로그아웃 되었습니다.");
  };

  // 초기 화면 설정
  get("main-page").classList.remove("hidden");
  get("board-page").classList.add("hidden");
  get("show-login").textContent = currentUser === "guest" ? "🔐 로그인" : `🔓 ${currentUser}`;
  if (currentUser !== "guest") loadPosts();
});
