let mode = "login";

const username = document.getElementById("username");
const password = document.getElementById("password");
const form = document.getElementById("form");
const submit = document.getElementById("submit");
const message = document.getElementById("message");

const auth = document.getElementById("auth");
const welcome = document.getElementById("welcome");
const name = document.getElementById("name");
const logout = document.getElementById("logout");


// 로그인 / 회원가입 버튼
document.querySelectorAll(".tab").forEach((button) => {

    button.addEventListener("click", () => {

        mode = button.dataset.mode;

        document
            .querySelectorAll(".tab")
            .forEach((tab) => {
                tab.classList.remove("active");
            });

        button.classList.add("active");

        if (mode === "login") {

            submit.textContent = "로그인";

            password.autocomplete =
                "current-password";

        } else {

            submit.textContent = "회원가입";

            password.autocomplete =
                "new-password";
        }

        message.textContent = "";
    });
});


// 로그인 / 회원가입
form.addEventListener("submit", async (event) => {

    event.preventDefault();

    message.textContent = "처리 중...";

    try {

        const response = await fetch(
            "/api/" + mode,
            {
                method: "POST",

                headers: {
                    "Content-Type":
                        "application/json"
                },

                body: JSON.stringify({
                    username: username.value,
                    password: password.value
                })
            }
        );

        const data = await response.json();

        if (!response.ok) {
            throw new Error(data.error);
        }

        showWelcome(data.user);

    } catch (error) {

        message.textContent =
            error.message;
    }
});


// 로그인 성공 화면
function showWelcome(user) {

    name.textContent =
        user.username;

    auth.hidden = true;

    welcome.hidden = false;
}


// 로그아웃
logout.addEventListener("click", async () => {

    await fetch(
        "/api/logout",
        {
            method: "POST"
        }
    );

    welcome.hidden = true;

    auth.hidden = false;

    username.value = "";
    password.value = "";

    message.textContent = "";
});


// 이미 로그인되어 있는지 확인
fetch("/api/me")
    .then((response) => response.json())
    .then((data) => {

        if (data.user) {
            showWelcome(data.user);
        }

    });
