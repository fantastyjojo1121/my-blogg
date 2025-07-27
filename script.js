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

  if (!currentUser || currentUser.startsWith("guest_") || currentUser === "guest") {
    currentUser = "guest_" + Math.random().toString(36).substring(2, 8);
    sessionStorage.setItem("guestUser", currentUser);
    localStorage.setItem("currentUser", currentUser);
  }

  let isAdmin = currentUser === "관리자";
  if (currentUser.startsWith("guest_")) {
    userData[currentUser] = { postCount: 0, recentPost: "" };
  }

  const updateStorage = () => {
    localStorage.setItem("userDB", JSON.stringify(userDB));
    localStorage.setItem("userData", JSON.stringify(userData));
    localStorage.setItem("currentUser", currentUser);
    localStorage.setItem("isAdmin", JSON.stringify(isAdmin));
  };

  const clearForm = () => {
    get("post-title").value = "";
    get("post-content").value = "";
    get("post-media").value = "";
  };

  const updateUserData = (content) => {
    userData[currentUser] ||= { postCount: 0, recentPost: "" };
    userData[currentUser].postCount++;
    userData[currentUser].recentPost = content;
    updateStorage();
  };

  // 게시글 목록
  const loadPosts = () => {
    db.ref("posts").on("value", snapshot => {
      posts.innerHTML = "";
      const data = snapshot.val();
      if (!data) return;

      Object.entries(data).reverse().forEach(([key, post]) => {
        const div = document.createElement("div");
        div.className = "post";
        div.innerHTML = `
          <h3>${post.title}</h3>
          <p><strong>${post.author}</strong> | ${post.date}</p>
          <div class="heart" data-key="${key}">❤️ <span>${post.likes || 0}</span></div>
        `;

        // 하트 로직
        const heart = div.querySelector(".heart");
        heart.style.cursor = "pointer";

        const likedPath = `likesByUser/${key}/${currentUser}`;
        db.ref(likedPath).get().then(snapshot => {
          const hasLiked = snapshot.exists();
          heart.classList.toggle("liked", hasLiked);
          heart.style.color = hasLiked ? "red" : "gray";
        });

        heart.addEventListener("click", async (e) => {
          e.stopPropagation(); // 게시글 상세 보기 방지

          const likedRef = db.ref(`likesByUser/${key}/${currentUser}`);
          const likedSnap = await likedRef.get();
          const postLikeRef = db.ref(`posts/${key}/likes`);
          const liked = likedSnap.exists();

          if (liked) {
            await likedRef.remove();
            await postLikeRef.transaction(count => (count || 1) - 1);
            heart.classList.remove("liked");
            heart.style.color = "gray";
          } else {
            await likedRef.set(true);
            await postLikeRef.transaction(count => (count || 0) + 1);
            heart.classList.add("liked");
            heart.style.color = "red";
          }

          const likeSnap = await postLikeRef.get();
          heart.querySelector("span").textContent = likeSnap.val() || 0;
        });

        // 게시글 상세 보기
        div.addEventListener("click", (e) => {
          if (!e.target.classList.contains("heart")) {
            showDetail(key, post);
          }
        });

        // 관리자 삭제
        if (isAdmin) {
          const del = document.createElement("button");
          del.textContent = "삭제";
          del.className = "delete-post";
          del.onclick = () => {
            if (confirm("정말 삭제하시겠습니까?")) {
              db.ref("posts/" + key).remove();
              db.ref("comments/" + key).remove();
              db.ref("likesByUser/" + key).remove();
            }
          };
          div.appendChild(del);
        }

        posts.appendChild(div);
      });
    });
  };

  // 게시글 상세 보기
  const showDetail = (key, post) => {
    get("detail-title").textContent = post.title;
    get("detail-author").textContent = `${post.author} | ${post.date}`;
    get("detail-content").textContent = post.content;

    const media = get("detail-media");
    media.innerHTML = "";
    if (post.file) {
      const el = post.file.type.startsWith("image/")
        ? document.createElement("img")
        : document.createElement("video");
      el.src = post.file.url;
      if (el.tagName === "VIDEO") el.controls = true;
      media.appendChild(el);
    }

    // 댓글 리스너 중복 방지
    db.ref(`comments/${key}`).off();

    const list = get("comments-list");
    list.innerHTML = "";

    db.ref(`comments/${key}`).on("child_added", snapshot => {
      const com = snapshot.val();
      const cid = snapshot.key;

      const li = document.createElement("li");
      li.innerHTML = `<strong>${com.author}</strong>: ${com.text} <span style="font-size:12px; color:#777;">(${com.date})</span>`;

      if (isAdmin) {
        const del = document.createElement("button");
        del.textContent = "삭제";
        del.style.marginLeft = "10px";
        del.onclick = () => {
          db.ref(`comments/${key}/${cid}`).remove();
        };
        li.appendChild(del);
      }

      list.appendChild(li);
    });

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

  // 초기 화면
  get("main-page").classList.remove("hidden");
  get("board-page").classList.add("hidden");
  get("show-login").textContent = currentUser.startsWith("guest_") ? "🔐 로그인" : `🔓 ${currentUser}`;
  if (!currentUser.startsWith("guest_")) loadPosts();

  // 페이지 전환
  get("go-to-board").onclick = () => {
    get("main-page").classList.add("hidden");
    get("board-page").classList.remove("hidden");
    loadPosts();
  };

  // 팝업 닫기
  document.querySelectorAll(".close").forEach(btn => {
    btn.onclick = () => get(btn.dataset.target).classList.add("hidden");
  });

  // 로그인 팝업
  get("show-login").onclick = () => {
    if (!currentUser.startsWith("guest_")) return alert("이미 로그인되어 있습니다.");
    get("login-popup").classList.remove("hidden");
  };

  // 눈 아이콘
  get("toggle-password").onclick = () => {
    const pw = get("login-password");
    pw.type = pw.type === "password" ? "text" : "password";
  };

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

  // 글쓰기 토글
  get("write-button").onclick = () => {
    get("post-form").classList.toggle("hidden");
  };

  // 글 작성
  get("submit-post").onclick = () => {
    const title = get("post-title").value.trim();
    const content = get("post-content").value.trim();
    const file = get("post-media").files[0];
    if (!title || (!content && !file)) return alert("제목과 내용 또는 파일을 입력하세요.");

    const now = new Date().toLocaleString();
    const post = {
      title, content,
      author: currentUser,
      date: now,
      file: null,
      likes: 0
    };

    if (file) {
      const reader = new FileReader();
      reader.onload = e => {
        post.file = { url: e.target.result, type: file.type };
        db.ref("posts").push(post);
        updateUserData(content);
        clearForm();
        get("post-form").classList.add("hidden");
      };
      reader.readAsDataURL(file);
    } else {
      db.ref("posts").push(post);
      updateUserData(content);
      clearForm();
      get("post-form").classList.add("hidden");
    }
  };

  // 내 정보 보기
  get("show-profile").onclick = () => {
    const data = userData[currentUser] || { postCount: 0, recentPost: "" };
    get("profile-name").textContent = `이름: ${currentUser}`;
    get("profile-post-count").textContent = `총 게시글 수: ${data.postCount}`;
    get("recent-post").textContent = `최근 게시글 내용: ${data.recentPost || "없음"}`;
    get("view-users-btn").classList.toggle("hidden", !isAdmin);
    get("logout-btn").classList.toggle("hidden", currentUser.startsWith("guest_"));
    get("profile-popup").classList.remove("hidden");
  };

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
    sessionStorage.setItem("guestUser", currentUser);
    isAdmin = false;
    updateStorage();
    get("profile-popup").classList.add("hidden");
    get("show-login").textContent = "🔐 로그인";
    alert("로그아웃 되었습니다. 게스트로 전환되었습니다.");
    loadPosts();
  };
});
