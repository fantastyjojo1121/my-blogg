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
  let currentUser = localStorage.getItem("currentUser");

  // 게스트 처리
  if (!currentUser) {
    currentUser = "guest_" + Math.random().toString(36).substring(2, 8);
    sessionStorage.setItem("guestUser", currentUser);
    localStorage.setItem("currentUser", currentUser);
  }

  let isAdmin = currentUser === "관리자";
  let userDB = JSON.parse(localStorage.getItem("userDB")) || { 관리자: "0000" };
  let userData = JSON.parse(localStorage.getItem("userData")) || {};
  const postList = get("posts");

  const updateStorage = () => {
    localStorage.setItem("userDB", JSON.stringify(userDB));
    localStorage.setItem("userData", JSON.stringify(userData));
    localStorage.setItem("currentUser", currentUser);
    localStorage.setItem("isAdmin", JSON.stringify(isAdmin));
  };

  const loadPosts = () => {
    db.ref("posts").on("value", snap => {
      postList.innerHTML = "";
      const data = snap.val();
      if (!data) return;
      Object.entries(data).reverse().forEach(([key, post]) => {
        const postCard = document.createElement("div");
        postCard.className = "post";
        postCard.innerHTML = `
          <h3>${post.title}</h3>
          <p><strong>${post.author}</strong> | ${post.date}</p>
          <div class="likes">
            <span class="heart ${post.likes?.[currentUser] ? 'liked' : ''}" data-id="${key}">❤️</span>
            <span class="like-count">${Object.keys(post.likes || {}).length}</span>
          </div>
        `;

        postCard.onclick = e => {
          if (e.target.classList.contains("heart")) return;
          showDetail(key, post);
        };

        // 삭제 버튼
        if (isAdmin) {
          const del = document.createElement("button");
          del.textContent = "삭제";
          del.className = "delete-post";
          del.onclick = (event) => {
            event.stopPropagation();
            if (confirm("정말 삭제하시겠습니까?")) {
              db.ref("posts/" + key).remove();
            }
          };
          postCard.appendChild(del);
        }

        postList.appendChild(postCard);
      });
    });
  };

  const showDetail = (key, post) => {
    get("detail-title").textContent = post.title;
    get("detail-author").textContent = `${post.author} | ${post.date}`;
    get("detail-content").textContent = post.content;
    const media = get("detail-media");
    media.innerHTML = "";
    if (post.file) {
      if (post.file.type.startsWith("image/")) {
        media.innerHTML = `<img src="${post.file.url}" alt="image">`;
      } else if (post.file.type.startsWith("video/")) {
        media.innerHTML = `<video src="${post.file.url}" controls></video>`;
      }
    }

    loadComments(key);

    get("add-comment").onclick = () => {
      const commentText = get("comment-input").value.trim();
      if (!commentText) return;
      const comment = {
        author: currentUser,
        text: commentText,
        date: new Date().toLocaleString()
      };
      db.ref(`comments/${key}`).push(comment);
      get("comment-input").value = "";
    };

    get("detail-popup").classList.remove("hidden");
  };

  const loadComments = (postId) => {
    const list = get("comments-list");
    list.innerHTML = "";
    db.ref(`comments/${postId}`).on("value", snap => {
      const data = snap.val();
      if (data) {
        Object.values(data).forEach(c => {
          const li = document.createElement("li");
          li.textContent = `${c.author}: ${c.text} (${c.date})`;
          list.appendChild(li);
        });
      }
    });
  };

  // 하트 토글
  postList.addEventListener("click", e => {
    if (e.target.classList.contains("heart")) {
      const id = e.target.dataset.id;
      const ref = db.ref("posts/" + id + "/likes");
      ref.once("value").then(snap => {
        const likes = snap.val() || {};
        if (likes[currentUser]) {
          delete likes[currentUser];
        } else {
          likes[currentUser] = true;
        }
        ref.set(likes);
      });
    }
  });
  // 글쓰기 버튼 토글
  get("write-button").onclick = () => {
    get("post-form").classList.toggle("hidden");
  };

  // 게시글 등록
  get("submit-post").onclick = () => {
    const title = get("post-title").value.trim();
    const content = get("post-content").value.trim();
    const fileInput = get("post-media");
    const now = new Date().toLocaleString();

    if (!title || !content) return alert("제목과 내용을 입력해주세요.");

    const post = {
      title,
      content,
      date: now,
      author: currentUser,
      file: null
    };

    if (fileInput.files.length > 0) {
      const file = fileInput.files[0];
      const reader = new FileReader();
      reader.onload = e => {
        post.file = {
          url: e.target.result,
          type: file.type
        };
        db.ref("posts").push(post);
        updateUserData(content);
      };
      reader.readAsDataURL(file);
    } else {
      db.ref("posts").push(post);
      updateUserData(content);
    }

    get("post-title").value = "";
    get("post-content").value = "";
    get("post-media").value = "";
    get("post-form").classList.add("hidden");
  };

  function updateUserData(content) {
    userData[currentUser] ||= { postCount: 0, recentPost: "" };
    userData[currentUser].postCount++;
    userData[currentUser].recentPost = content;
    updateStorage();
  }

  // 로그인 관련
  get("login-btn").onclick = () => {
    const u = get("login-username").value.trim();
    const p = get("login-password").value.trim();
    if (!u || !p) return alert("입력하세요.");
    if (!userDB[u]) return alert("회원가입 먼저 해주세요.");
    if (userDB[u] !== p) return alert("비밀번호 오류.");
    currentUser = u;
    isAdmin = u === "관리자";
    updateStorage();
    get("show-login").textContent = `🔓 ${currentUser}`;
    get("login-popup").classList.add("hidden");
    alert(`${currentUser}님 환영합니다!`);
    loadPosts();
  };

  get("register-btn").onclick = () => {
    const u = get("login-username").value.trim();
    const p = get("login-password").value.trim();
    if (!u || !p) return alert("입력하세요.");
    if (userDB[u]) return alert("이미 존재하는 아이디입니다.");
    userDB[u] = p;
    userData[u] = { postCount: 0, recentPost: "" };
    updateStorage();
    alert("회원가입 완료!");
  };

  get("show-login").onclick = () => get("login-popup").classList.remove("hidden");

get("show-profile").onclick = () => {
  const d = userData[currentUser] || { postCount: 0, recentPost: "" };
  get("profile-name").textContent = `이름: ${currentUser}`;
  get("profile-post-count").textContent = `총 게시글 수: ${d.postCount}`;
  get("recent-post").textContent = `최근 게시글: ${d.recentPost || "없음"}`;
  get("view-users-btn").classList.toggle("hidden", !isAdmin);
  get("logout-btn").classList.toggle("hidden", currentUser.startsWith("guest_")); // ✅ 추가된 부분
  get("profile-popup").classList.remove("hidden");
};


  get("logout-btn").onclick = () => {
    currentUser = "guest_" + Math.random().toString(36).substring(2, 8);
    sessionStorage.setItem("guestUser", currentUser);
    isAdmin = false;
    updateStorage();
    get("show-login").textContent = "🔐 로그인";
    get("profile-popup").classList.add("hidden");
    alert("게스트로 전환되었습니다.");
  };

  get("view-users-btn").onclick = () => {
    const ul = get("user-list");
    ul.innerHTML = "";
    Object.keys(userDB).forEach(user => {
      const li = document.createElement("li");
      li.textContent = user;
      ul.appendChild(li);
    });
    get("user-list-popup").classList.remove("hidden");
  };

  // 팝업 닫기
  document.querySelectorAll(".close").forEach(btn => {
    btn.onclick = () => {
      document.getElementById(btn.dataset.target).classList.add("hidden");
    };
  });

  // 비밀번호 눈 모양
  const pwInput = get("login-password");
  const toggle = get("toggle-password");
  toggle.onclick = () => {
    pwInput.type = pwInput.type === "password" ? "text" : "password";
  };

  // 초기 화면
  get("main-page").classList.remove("hidden");
  get("board-page").classList.add("hidden");

  get("go-to-board").onclick = () => {
    get("main-page").classList.add("hidden");
    get("board-page").classList.remove("hidden");
    get("show-login").textContent = currentUser.startsWith("guest_") ? "🔐 로그인" : `🔓 ${currentUser}`;
    loadPosts();
  };

});
