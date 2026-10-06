# Study Plan Optimizer

DAA hackathon project. Chooses which topics to study within limited hours to maximise expected marks.

**DAA concept:** Dynamic Programming (0/1 Knapsack)

## Idea
Each topic has hours (cost) and expected marks (benefit). With H hours available, pick topics to maximise total marks.

    dp[i][c] = dp[i-1][c]                                  if w[i] > c
             = max(dp[i-1][c], dp[i-1][c-w[i]] + v[i])     otherwise

Time O(n*W), space O(n*W). Greedy (marks per hour) is shown for comparison because it is not always optimal.

## Files
- backend.py : Python backend, DP algorithm and a small web server (no installs needed)
- index.html, style.css, script.js : frontend

## Run
    python backend.py
Open http://127.0.0.1:8000
