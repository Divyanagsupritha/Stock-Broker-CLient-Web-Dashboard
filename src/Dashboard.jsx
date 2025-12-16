import React, { useState, useEffect, useRef } from "react";

const SUPPORTED = ["GOOG", "TSLA", "AMZN", "META", "NVDA"];
const CHANNEL_NAME = "stock-channel-v1";

function randomDelta() {
  return (Math.random() - 0.5) * 0.02;
}

export default function Dashboard() {
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [isSignup, setIsSignup] = useState(false);
  const [loggedIn, setLoggedIn] = useState(false);
  const [activeUser, setActiveUser] = useState("");

  const [prices, setPrices] = useState({
    GOOG: 1500,
    TSLA: 650,
    AMZN: 120,
    META: 320,
    NVDA: 420,
  });

  const [subs, setSubs] = useState([]);

  // ---------- SPARKLINE DATA ----------
  const [chartData, setChartData] = useState({
    GOOG: Array(20).fill(50),
    TSLA: Array(20).fill(50),
    AMZN: Array(20).fill(50),
    META: Array(20).fill(50),
    NVDA: Array(20).fill(50),
  });

  const bcRef = useRef(null);
  const usersKey = "all-users";

  // ---------- BROADCAST CHANNEL ----------
  useEffect(() => {
    const bc = new BroadcastChannel(CHANNEL_NAME);
    bc.onmessage = (msg) => {
      if (msg.data.type === "prices") {
        setPrices(msg.data.prices);
      }
    };
    bcRef.current = bc;
    return () => bc.close();
  }, []);

  // ---------- PRICE + SPARKLINE UPDATE ----------
  useEffect(() => {
    const tick = () => {
      setPrices((prev) => {
        const nextPrices = { ...prev };
        const nextCharts = { ...chartData };

        SUPPORTED.forEach((t) => {
          nextPrices[t] = nextPrices[t] * (1 + randomDelta());

          const prevPoint =
            nextCharts[t][nextCharts[t].length - 1] ?? 50;

          const delta = (Math.random() - 0.5) * 10;
          const nextValue = Math.min(
            90,
            Math.max(10, prevPoint + delta)
          );

          nextCharts[t] = [...nextCharts[t].slice(1), nextValue];
        });

        setChartData(nextCharts);
        bcRef.current?.postMessage({
          type: "prices",
          prices: nextPrices,
        });

        return nextPrices;
      });
    };

    const interval = setInterval(tick, 1000);
    return () => clearInterval(interval);
  }, [chartData]);

  // ---------- AUTH ----------
  const handleSignup = () => {
    const users = JSON.parse(localStorage.getItem(usersKey) || "{}");
    if (users[username]) return alert("User already exists");

    users[username] = password;
    localStorage.setItem(usersKey, JSON.stringify(users));
    alert("Account created! Login now.");
    setIsSignup(false);
  };

  const handleLogin = () => {
    const users = JSON.parse(localStorage.getItem(usersKey) || "{}");
    if (!users[username] || users[username] !== password)
      return alert("Invalid credentials");

    setLoggedIn(true);
    setActiveUser(username);

    const saved = localStorage.getItem(`subs-${username}`);
    setSubs(saved ? JSON.parse(saved) : []);
  };

  const handleSignOut = () => {
    setLoggedIn(false);
    setUsername("");
    setPassword("");
    setActiveUser("");
  };

  const toggleSub = (t) => {
    setSubs((prev) => {
      const updated = prev.includes(t)
        ? prev.filter((x) => x !== t)
        : [...prev, t];

      localStorage.setItem(`subs-${activeUser}`, JSON.stringify(updated));
      return updated;
    });
  };

  // ---------- LOGIN UI ----------
  if (!loggedIn)
    return (
      <div className="login-wrapper">
        <div className="login-box">
          <h1 className="app-title">TradeFlow</h1>

          <input
            className="input"
            placeholder="Username"
            value={username}
            onChange={(e) => setUsername(e.target.value)}
          />

          <input
            type="password"
            className="input"
            placeholder="Password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
          />

          <button
            className="button"
            onClick={isSignup ? handleSignup : handleLogin}
          >
            {isSignup ? "Sign Up" : "Login"}
          </button>

          <p className="switch" onClick={() => setIsSignup(!isSignup)}>
            {isSignup
              ? "Already have an account? Login"
              : "New user? Create an account"}
          </p>
        </div>
      </div>
    );

  // ---------- DASHBOARD ----------
  return (
    <div className="dashboard">
      <div className="dashboard-header">
        <h1>Dashboard</h1>
        <button className="signout-button" onClick={handleSignOut}>
          Sign Out
        </button>
      </div>

      <div className="dashboard-columns">
        {/* MARKET OVERVIEW */}
        <div className="market-overview">
          <h2>Market Overview</h2>

          <table>
            <thead>
              <tr>
                <th>Symbol</th>
                <th>Price</th>
                <th>Change</th>
                <th>Action</th>
              </tr>
            </thead>
            <tbody>
              {SUPPORTED.map((t) => (
                <tr key={t}>
                  <td>{t}</td>
                  <td>${prices[t].toFixed(2)}</td>
                  <td className="green">+{(prices[t] - 100).toFixed(2)}</td>
                  <td>
                    <button
                      className={
                        subs.includes(t)
                          ? "unsubscribe-btn"
                          : "subscribe-btn"
                      }
                      onClick={() => toggleSub(t)}
                    >
                      {subs.includes(t) ? "Unsubscribe" : "Subscribe"}
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* PORTFOLIO */}
        <div className="portfolio">
          <h2>My Portfolio</h2>

          {subs.map((t) => (
            <div key={t} className="portfolio-card">
              <div className="portfolio-header">
                <h3>{t}</h3>
                <span>${prices[t].toFixed(2)}</span>
              </div>

              <div className="sparkline-container">
                <svg viewBox="0 0 100 100" preserveAspectRatio="none">
                  <polyline
                    fill="none"
                    stroke="#38bdf8"
                    strokeWidth="3"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    points={chartData[t]
                      .map((v, i) => {
                        const x =
                          (i /
                            (chartData[t].length - 1)) *
                          100;
                        const y = 100 - v;
                        return `${x},${y}`;
                      })
                      .join(" ")}
                  />
                </svg>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
