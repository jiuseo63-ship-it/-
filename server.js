const express = require("express");
const session = require("express-session");
const pgSession = require("connect-pg-simple")(session);
const { Pool } = require("pg");
const bcrypt = require("bcryptjs");
const path = require("path");

const app = express();
const PORT = process.env.PORT || 3000;

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: process.env.DATABASE_URL
    ? { rejectUnauthorized: false }
    : false
});

app.use(express.json());
app.use(express.urlencoded({ extended: true }));

app.use(
  session({
    store: new pgSession({
      pool: pool,
      tableName: "user_sessions",
      createTableIfMissing: true
    }),
    secret: process.env.SESSION_SECRET || "change-this-secret",
    resave: false,
    saveUninitialized: false,
    cookie: {
      maxAge: 1000 * 60 * 60 * 24 * 7,
      httpOnly: true,
      sameSite: "lax",
      secure: process.env.NODE_ENV === "production"
    }
  })
);

app.use(express.static(path.join(__dirname, "public")));

async function initDatabase() {
  if (!process.env.DATABASE_URL) {
    console.log("DATABASE_URL이 설정되지 않았습니다.");
    return;
  }

  await pool.query(`
    CREATE TABLE IF NOT EXISTS users (
      id SERIAL PRIMARY KEY,
      username VARCHAR(30) UNIQUE NOT NULL,
      password_hash TEXT NOT NULL,
      created_at TIMESTAMPTZ DEFAULT NOW()
    )
  `);

  console.log("데이터베이스 준비 완료!");
}

// 회원가입
app.post("/api/register", async (req, res) => {
  try {
    const username = String(req.body.username || "").trim();
    const password = String(req.body.password || "");

    if (!/^[A-Za-z0-9_]{3,30}$/.test(username)) {
      return res.status(400).json({
        error: "아이디는 영문, 숫자, _만 사용해서 3~30자로 입력하세요."
      });
    }

    if (password.length < 6) {
      return res.status(400).json({
        error: "비밀번호는 6자 이상이어야 합니다."
      });
    }

    const passwordHash = await bcrypt.hash(password, 12);

    const result = await pool.query(
      `INSERT INTO users (username, password_hash)
       VALUES ($1, $2)
       RETURNING id, username`,
      [username, passwordHash]
    );

    req.session.user = result.rows[0];

    res.json({
      ok: true,
      user: req.session.user
    });
  } catch (error) {
    if (error.code === "23505") {
      return res.status(409).json({
        error: "이미 사용 중인 아이디입니다."
      });
    }

    console.error(error);

    res.status(500).json({
      error: "회원가입 중 오류가 발생했습니다."
    });
  }
});

// 로그인
app.post("/api/login", async (req, res) => {
  try {
    const username = String(req.body.username || "").trim();
    const password = String(req.body.password || "");

    const result = await pool.query(
      `SELECT id, username, password_hash
       FROM users
       WHERE username = $1`,
      [username]
    );

    const user = result.rows[0];

    if (!user) {
      return res.status(401).json({
        error: "아이디 또는 비밀번호가 올바르지 않습니다."
      });
    }

    const passwordCorrect = await bcrypt.compare(
      password,
      user.password_hash
    );

    if (!passwordCorrect) {
      return res.status(401).json({
        error: "아이디 또는 비밀번호가 올바르지 않습니다."
      });
    }

    req.session.user = {
      id: user.id,
      username: user.username
    };

    res.json({
      ok: true,
      user: req.session.user
    });
  } catch (error) {
    console.error(error);

    res.status(500).json({
      error: "로그인 중 오류가 발생했습니다."
    });
  }
});

// 현재 로그인 상태 확인
app.get("/api/me", (req, res) => {
  res.json({
    user: req.session.user || null
  });
});

// 로그아웃
app.post("/api/logout", (req, res) => {
  req.session.destroy(() => {
    res.json({
      ok: true
    });
  });
});

initDatabase()
  .then(() => {
    app.listen(PORT, () => {
      console.log(`서버 실행 중: ${PORT}`);
    });
  })
  .catch((error) => {
    console.error("서버 시작 실패:", error);
  });
