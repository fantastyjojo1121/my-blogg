// Firebase 초기화
const firebaseConfig = {
  apiKey: "AIzaSyBJcdO1Iz42-sj19f3X43JRecK2dZHM8XM",
  authDomain: "my-blogg-25c16.firebaseapp.com",
  projectId: "my-blogg-25c16",
  storageBucket: "my-blogg-25c16.firebasestorage.app",
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

  get("go-to-board").onclick = () => {
    get("main-page").classList.add("hidden");
    get("board-page").classList.remove("hidden");
    get("show-login").textContent = currentUser === "guest" ? "🔐 로그인" : `🔓 ${currentUser}`;
    loadPosts();
  };

  document.querySelectorAll(".close").forEach(btn => {
    btn.onclick = () => {
      const popupId = btn.getAttribute("data-target");
      document.getElementById(popupId).classList.add("hidden");
    };
  });

  get("show-login").onclick = () => {
    if (currentUser === "guest") {
      get("login-popup").classList.remove("hidden");
    } else {
      alert(`${currentUser}님은 이미 로그인 상태입니다.`);
    }
  };

  get("login-btn").onclick = () => {
    const username = get("login-username").value.trim();
    const password = get("login-password").value.trim();

    if (!username || !password) {
      alert("아이디와 비밀번호를 모두 입력하세요.");
      return;
    }

    if (userDB[username] && userDB[username] === password) {
      currentUser = username;
      isAdmin = currentUser === "관리자";
      userData[currentUser] = userData[currentUser] || { postCount: 0, recentPost: "" };
      updateStorage();
      alert(`${currentUser}님 환영합니다!`);
      get("login-popup").classList.add("hidden");
      get("show-login").textContent = `🔓 ${currentUser}`;
      loadPosts();
    } else {
      alert("아이디 또는 비밀번호가 올바르지 않습니다.");
    }
  };

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

  get("submit-post").onclick = () => {
    if (currentUser === "guest") {
      alert("로그인 후에 글을 작성할 수 있습니다.");
      return;
    }
    const content = get("post-content").value.trim();
    const mediaInput = get("post-media");
    if (!content && mediaInput.files.length === 0) {
      alert("내용이나 미디어를 입력해주세요.");
      return;
    }

    const now = new Date().toLocaleString();

    if (mediaInput.files.length > 0) {
      const file = mediaInput.files[0];
      const reader = new FileReader();
      reader.onload = e => {
        const fileDataUrl = e.target.result;

        const newPost = {
          author: currentUser,
          content,
          date: now,
          file: {
            url: fileDataUrl,
            type: file.type
          }
        };

        db.ref("posts").push(newPost);
        updateUserPostData(currentUser, content);
        clearPostForm();
      };
      reader.readAsDataURL(file);
    } else {
      const newPost = {
        author: currentUser,
        content,
        date: now,
        file: null
      };
      db.ref("posts").push(newPost);
      updateUserPostData(currentUser, content);
      clearPostForm();
    }
  };

  function updateUserPostData(username, content) {
    userData[username] = userData[username] || { postCount: 0, recentPost: "" };
    userData[username].postCount++;
    userData[username].recentPost = content;
    updateStorage();
  }

  function clearPostForm() {
    get("post-content").value = "";
    get("post-media").value = "";
  }

  get("show-profile").onclick = () => {
    if (currentUser === "guest") {
      alert("로그인 후 이용 가능합니다.");
      return;
    }
    get("profile-name").textContent = `이름: ${currentUser}`;
    get("profile-post-count").textContent = `게시글 수: ${userData[currentUser]?.postCount || 0}`;
    get("recent-post").textContent = `최근 글: ${userData[currentUser]?.recentPost || "없음"}`;
    get("profile-popup").classList.remove("hidden");

    if (isAdmin) {
      get("view-users-btn").classList.remove("hidden");
    } else {
      get("view-users-btn").classList.add("hidden");
    }
  };

  get("view-users-btn").onclick = () => {
    const userListElem = get("user-list");
    userListElem.innerHTML = "";
    Object.keys(userDB).forEach(user => {
      const li = document.createElement("li");
      li.textContent = user;
      userListElem.appendChild(li);
    });
    get("user-list-popup").classList.remove("hidden");
  };

  get("logout-btn").onclick = () => {
    currentUser = "guest";
    isAdmin = false;
    updateStorage();
    get("profile-popup").classList.add("hidden");
    get("show-login").textContent = "🔐 로그인";
    alert("로그아웃 되었습니다.");
  };

  get("main-page").classList.remove("hidden");
  get("board-page").classList.add("hidden");
  get("show-login").textContent = currentUser === "guest" ? "🔐 로그인" : `🔓 ${currentUser}`;

  if (currentUser !== "guest") {
    loadPosts();
  }
});
