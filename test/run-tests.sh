#!/bin/bash

API="http://localhost:3030/analysis/analyze"
PASS=0
FAIL=0
OBS=0
TOTAL=0

# Verdict rank for range comparisons: RED=0, YELLOW=1, GREEN=2
verdict_rank() {
  case "$1" in
    RED)    echo 0 ;;
    YELLOW) echo 1 ;;
    GREEN)  echo 2 ;;
    *)      echo -1 ;;
  esac
}

# run_test label lat lng type budget [min_verdict [max_verdict]]
#   min_verdict — lowest acceptable verdict inclusive (e.g. YELLOW means YELLOW or GREEN pass)
#   max_verdict — highest acceptable verdict inclusive (e.g. YELLOW means RED or YELLOW pass)
#   Both empty  — observation mode: always logged, never counted as pass/fail
run_test() {
  local label="$1" lat="$2" lng="$3" type="$4" budget="$5"
  local min_v="${6:-}" max_v="${7:-}"

  TOTAL=$((TOTAL + 1))
  echo -n "[$TOTAL] $label ... "

  local raw elapsed result
  raw=$(curl -s --max-time 120 -w '\n__TIME__%{time_total}' -X POST "$API" \
    -H "Content-Type: application/json" \
    -d "{\"lat\":$lat,\"lng\":$lng,\"businessType\":\"$type\",\"budget\":$budget}")

  elapsed=$(echo "$raw" | grep '__TIME__' | sed 's/__TIME__//')
  result=$(echo "$raw" | grep -v '__TIME__')

  local verdict score demand comp ff ma runway
  verdict=$(echo "$result" | jq -r '.verdict // "ERROR"')
  score=$(echo "$result"   | jq -r '.score   // "?"')
  demand=$(echo "$result"  | jq -r '.metrics.demand       // "?"')
  comp=$(echo "$result"    | jq -r '.metrics.competition  // "?"')
  ff=$(echo "$result"      | jq -r '.latentFactors.financialFeasibility  // "?"')
  ma=$(echo "$result"      | jq -r '.latentFactors.marketAttractiveness  // "?"')
  runway=$(echo "$result"  | jq -r '.metrics.runway // "?"')

  local info="verdict=$verdict score=$score | demand=$demand comp=$comp | ff=$ff ma=$ma runway=${runway}mo  [${elapsed}s]"

  if [ "$verdict" = "ERROR" ]; then
    echo "FAIL  ($(echo "$result" | jq -r '.message // .error // "unknown"'))  [${elapsed}s]"
    FAIL=$((FAIL + 1))
    sleep 1
    return
  fi

  # Observation mode — no constraint
  if [ -z "$min_v" ] && [ -z "$max_v" ]; then
    echo "OBS   $info"
    OBS=$((OBS + 1))
    sleep 1
    return
  fi

  local rank_v ok=1 reason=""
  rank_v=$(verdict_rank "$verdict")

  if [ -n "$min_v" ]; then
    local rank_min
    rank_min=$(verdict_rank "$min_v")
    if [ "$rank_v" -lt "$rank_min" ]; then
      ok=0; reason="got $verdict, expected >= $min_v"
    fi
  fi

  if [ -n "$max_v" ] && [ "$ok" = "1" ]; then
    local rank_max
    rank_max=$(verdict_rank "$max_v")
    if [ "$rank_v" -gt "$rank_max" ]; then
      ok=0; reason="got $verdict, expected <= $max_v"
    fi
  fi

  if [ "$ok" = "1" ]; then
    echo "OK    $info"
    PASS=$((PASS + 1))
  else
    echo "FAIL  $info  ($reason)"
    FAIL=$((FAIL + 1))
  fi

  sleep 1
}

# constraint_test: asserts constraint gate fired — score=0, riskLevel=1, exactly 1 risk message
constraint_test() {
  local label="$1" lat="$2" lng="$3" type="$4" budget="$5"
  TOTAL=$((TOTAL + 1))
  echo -n "[CNST] $label ... "

  local raw verdict score rl risks
  raw=$(curl -s --max-time 120 -X POST "$API" \
    -H "Content-Type: application/json" \
    -d "{\"lat\":$lat,\"lng\":$lng,\"businessType\":\"$type\",\"budget\":$budget}")

  verdict=$(echo "$raw" | jq -r '.verdict        // "ERROR"')
  score=$(echo "$raw"   | jq -r '.score          // "-1"')
  rl=$(echo "$raw"      | jq -r '.latentFactors.riskLevel // "-1"')
  risks=$(echo "$raw"   | jq -r '.report.risks | length')

  if [ "$verdict" = "RED" ] && [ "$score" = "0" ] && [ "$rl" = "1" ] && [ "$risks" = "1" ]; then
    echo "OK    verdict=RED score=0 riskLevel=1 risks=1"
    PASS=$((PASS + 1))
  else
    echo "FAIL  verdict=$verdict score=$score riskLevel=$rl risks=$risks"
    FAIL=$((FAIL + 1))
  fi
}

# stability_test: same request 3x — asserts all verdicts are identical
stability_test() {
  local label="$1" lat="$2" lng="$3" type="$4" budget="$5"
  TOTAL=$((TOTAL + 1))
  echo -n "[STAB] $label ... "

  local v=()
  for _ in 1 2 3; do
    local raw verdict
    raw=$(curl -s --max-time 120 -X POST "$API" \
      -H "Content-Type: application/json" \
      -d "{\"lat\":$lat,\"lng\":$lng,\"businessType\":\"$type\",\"budget\":$budget}")
    verdict=$(echo "$raw" | jq -r '.verdict // "ERROR"')
    v+=("$verdict")
  done

  if [ "${v[0]}" = "${v[1]}" ] && [ "${v[1]}" = "${v[2]}" ]; then
    echo "STABLE  (${v[0]} x3)"
    PASS=$((PASS + 1))
  else
    echo "UNSTABLE  ${v[0]} / ${v[1]} / ${v[2]}"
    FAIL=$((FAIL + 1))
  fi
}

echo "===== BizSpot test run ====="
echo "Ranges: [min_verdict, max_verdict]. OBS = observation only (unconstrained)."
echo ""

# ── BUDGET SWEEP — coffee_shop, Kyiv center ───────────────────────────────
# Goal: verify FF hard-blocks below minBudget (20k), gradual unlock above it.
# Kyiv center has high competition (~49/~63 sat) → GREEN unlikely below 80k.
echo "--- Budget sweep: coffee_shop @ Kyiv center (minBudget=20k) ---"
run_test "coffee_shop / 5k   (far below min)"   50.4501 30.5234 coffee_shop   5000  ""     RED
run_test "coffee_shop / 15k  (below min)"        50.4501 30.5234 coffee_shop  15000  ""     RED
run_test "coffee_shop / 25k  (just above min)"   50.4501 30.5234 coffee_shop  25000  YELLOW ""
run_test "coffee_shop / 35k"                     50.4501 30.5234 coffee_shop  35000  YELLOW ""
run_test "coffee_shop / 50k"                     50.4501 30.5234 coffee_shop  50000  YELLOW ""
run_test "coffee_shop / 80k  (generous)"         50.4501 30.5234 coffee_shop  80000  YELLOW GREEN
run_test "coffee_shop / 120k (very high)"        50.4501 30.5234 coffee_shop 120000  GREEN  ""

# ── BUDGET SWEEP — pharmacy, Kyiv center ──────────────────────────────────
# minBudget=60k, high barrier. Strict RED below 60k, range above.
echo ""
echo "--- Budget sweep: pharmacy @ Kyiv center (minBudget=60k) ---"
run_test "pharmacy / 10k  (far below min)"  50.4501 30.5234 pharmacy  10000  ""     RED
run_test "pharmacy / 40k  (below min)"      50.4501 30.5234 pharmacy  40000  ""     RED
run_test "pharmacy / 60k  (at min)"         50.4501 30.5234 pharmacy  60000  ""     YELLOW
run_test "pharmacy / 80k"                   50.4501 30.5234 pharmacy  80000  YELLOW ""
run_test "pharmacy / 120k"                  50.4501 30.5234 pharmacy 120000  YELLOW GREEN
run_test "pharmacy / 200k (very high)"      50.4501 30.5234 pharmacy 200000  GREEN  ""

# ── BUDGET SWEEP — barbershop, Lviv center ────────────────────────────────
# minBudget=15k. Lviv is mid-size city → demand moderate.
echo ""
echo "--- Budget sweep: barbershop @ Lviv center (minBudget=15k) ---"
run_test "barbershop / 8k  (below min)"   49.8397 24.0297 barbershop   8000  ""     RED
run_test "barbershop / 15k (at min)"      49.8397 24.0297 barbershop  15000  ""     YELLOW
run_test "barbershop / 20k"               49.8397 24.0297 barbershop  20000
run_test "barbershop / 30k"               49.8397 24.0297 barbershop  30000  YELLOW ""
run_test "barbershop / 50k (generous)"    49.8397 24.0297 barbershop  50000  YELLOW GREEN

# ── BUSINESS TYPE SWEEP — Kyiv center, budget=50k ────────────────────────
# Same location/budget. Observation only — compares how type changes metrics.
# auto_repair (minBudget=50k) is borderline; pharmacy (60k) should be RED.
echo ""
echo "--- Business type sweep: Kyiv center / budget=50k ---"
run_test "coffee_shop  / 50k"   50.4501 30.5234 coffee_shop   50000  YELLOW ""
run_test "barbershop   / 50k"   50.4501 30.5234 barbershop    50000  YELLOW ""
run_test "grocery_store/ 50k"   50.4501 30.5234 grocery_store 50000  ""     YELLOW
run_test "car_wash     / 50k"   50.4501 30.5234 car_wash      50000  ""
run_test "auto_repair  / 50k"   50.4501 30.5234 auto_repair   50000  ""     YELLOW
run_test "pharmacy     / 50k"   50.4501 30.5234 pharmacy      50000  ""     RED

# ── LOCATION SWEEP — coffee_shop, budget=40k ─────────────────────────────
# Observation: how score varies across cities at fixed budget.
# No expected — comparing relative demand/rent signals.
echo ""
echo "--- Location sweep: coffee_shop / budget=40k (observation) ---"
run_test "Kyiv center"         50.4501 30.5234 coffee_shop 40000
run_test "Kyiv Obolon"         50.5037 30.4977 coffee_shop 40000
run_test "Kyiv Darnytsia"      50.4157 30.6527 coffee_shop 40000
run_test "Lviv center"         49.8397 24.0297 coffee_shop 40000
run_test "Kharkiv center"      49.9935 36.2304 coffee_shop 40000
run_test "Odesa center"        46.4825 30.7233 coffee_shop 40000
run_test "Dnipro center"       48.4647 35.0462 coffee_shop 40000
run_test "Vinnytsia center"    49.2331 28.4682 coffee_shop 40000
run_test "Poltava center"      49.5883 34.5514 coffee_shop 40000
run_test "Ivano-Frankivsk"     48.9226 24.7111 coffee_shop 40000
run_test "Zhytomyr center"     50.2547 28.6587 coffee_shop 40000
run_test "Chernivtsi center"   48.2921 25.9353 coffee_shop 40000

# ── NEIGHBORHOOD SWEEP — Kyiv, barbershop, budget=25k ────────────────────
# Rent differs by district. Observation — comparing district pressure effect.
echo ""
echo "--- Neighborhood sweep: barbershop @ Kyiv / budget=25k (observation) ---"
run_test "Kyiv Pechersk (premium)"   50.4356 30.5330 barbershop 25000
run_test "Kyiv center"               50.4501 30.5234 barbershop 25000
run_test "Kyiv Podil"                50.4626 30.5194 barbershop 25000
run_test "Kyiv Obolon"               50.5037 30.4977 barbershop 25000
run_test "Kyiv Darnytsia (outskirt)" 50.4157 30.6527 barbershop 25000
run_test "Kyiv Troieshchyna"         50.5115 30.6308 barbershop 25000

# ── AUTO SERVICES ─────────────────────────────────────────────────────────
echo ""
echo "--- Auto services: various cities ---"
run_test "Kyiv / auto_repair / 60k"    50.4501 30.5234 auto_repair  60000  YELLOW ""
run_test "Kyiv / auto_repair / 100k"   50.4501 30.5234 auto_repair 100000  YELLOW GREEN
run_test "Lviv / auto_repair / 100k"   49.8397 24.0297 auto_repair 100000  YELLOW GREEN
run_test "Kharkiv / car_wash / 50k"    49.9935 36.2304 car_wash     50000  ""
run_test "Odesa / car_wash / 35k"      46.4283 30.7558 car_wash     35000  ""
run_test "Poltava / auto_repair / 55k" 49.5883 34.5514 auto_repair  55000  ""

# ── EDGE CASES ────────────────────────────────────────────────────────────
echo ""
echo "--- Edge cases ---"
run_test "Lviv / coffee_shop / 5k (extreme low)"    49.8397 24.0297 coffee_shop    5000  ""    RED
run_test "Kyiv / pharmacy / 200k (extreme high)"    50.4501 30.5234 pharmacy     200000  GREEN ""
run_test "Kyiv / grocery_store / 15k (below min)"   50.4501 30.5234 grocery_store 15000  ""    RED
run_test "Kyiv / grocery_store / 80k"               50.4501 30.5234 grocery_store 80000  YELLOW ""

# ── STABILITY TESTS ───────────────────────────────────────────────────────
# Same request 3x — verifies deterministic scoring (no drift from external APIs).
echo ""
echo "--- Stability tests (3x same request, must return identical verdict) ---"
stability_test "coffee_shop / 35k @ Kyiv center"    50.4501 30.5234 coffee_shop  35000
stability_test "barbershop / 30k @ Lviv center"     49.8397 24.0297 barbershop   30000
stability_test "pharmacy / 120k @ Kyiv center"      50.4501 30.5234 pharmacy    120000
stability_test "auto_repair / 100k @ Kyiv center"   50.4501 30.5234 auto_repair 100000

# ── CONSTRAINT GATE TESTS ─────────────────────────────────────────────────
# Verify budget < minBudget triggers hard gate: score=0, riskLevel=1, 1 risk message.
# These must never pass through fuzzy inference.
echo ""
echo "--- Constraint gate: budget < minBudget ---"
constraint_test "coffee_shop  / 5k  (minBudget=20k)" 50.4501 30.5234 coffee_shop    5000
constraint_test "coffee_shop  / 15k (minBudget=20k)" 50.4501 30.5234 coffee_shop   15000
constraint_test "pharmacy     / 10k (minBudget=60k)" 50.4501 30.5234 pharmacy      10000
constraint_test "pharmacy     / 40k (minBudget=60k)" 50.4501 30.5234 pharmacy      40000
constraint_test "grocery_store/ 15k (minBudget=30k)" 50.4501 30.5234 grocery_store 15000

echo ""
echo "===== Results: $PASS passed, $FAIL failed, $OBS observations — $TOTAL total ====="
