# Sokoban solver

Push-optimal Sokoban solver for [make.fun][bounty].

[![Competition](https://make.fun/badge/sokoban-solver-01-run-20261121.svg)][bounty]
[![Rank](https://make.fun/badge/sokoban-solver-01-run-20261121/cbelel/sokoban-solver-01/rank.svg)](https://make.fun/bounty/sokoban-solver-01-run-20261121/leaderboard)
[![Reward](https://make.fun/badge/sokoban-solver-01-run-20261121/cbelel/sokoban-solver-01/reward.svg)][bounty]

## How it works

A* solves each room in pushes using reverse distances, goal matching and deadlock pruning. BFS stitches the pushes into walks.

[bounty]: https://make.fun/bounty/sokoban-solver-01-run-20261121
