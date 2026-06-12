from fractions import Fraction
from functools import lru_cache


# 硬编码参数，可按需直接修改
INITIAL_CARDS = (5,5,5,8,6)
REWARDS = (0,1000,2000,4000,7500,12000,20000,36000,60000,100000,160000)
TOTAL_CHALLENGES = 4
TOTAL_DOUBLES = 2
TOTAL_GIVEUPS = 3
OVERLOAD_MODE = "count_all"  # 可选: count_all / ignore_two_layer / ignore_all


def one_hot(index: int):
    return tuple(Fraction(int(i == index), 1) for i in range(11))


def weighted_sum(items):
    total_value = Fraction(0, 1)
    total_dist = [Fraction(0, 1) for _ in range(11)]
    for prob, value, dist in items:
        total_value += prob * value
        for i in range(11):
            total_dist[i] += prob * dist[i]
    return total_value, tuple(total_dist)


def reward(points: int) -> int:
    return REWARDS[points % 11]


def overload_limit():
    if OVERLOAD_MODE == "count_all":
        return None
    if OVERLOAD_MODE == "ignore_two_layer":
        return 21
    if OVERLOAD_MODE == "ignore_all":
        return 10
    raise ValueError(f"unknown OVERLOAD_MODE: {OVERLOAD_MODE}")


def is_overloaded(points: int) -> bool:
    limit = overload_limit()
    return limit is not None and points > limit


def zero_result(action: str):
    return Fraction(0, 1), tuple(Fraction(0, 1) for _ in range(11)), action


def next_states(cards):
    total_cards = sum(cards)
    for idx, count in enumerate(cards):
        if count <= 0:
            continue
        next_cards = list(cards)
        next_cards[idx] -= 1
        yield Fraction(count, total_cards), tuple(next_cards), idx + 1


def better(candidate, best):
    # 元组结构：(value, dist, action)
    if best is None:
        return True
    if candidate[0] != best[0]:
        return candidate[0] > best[0]
    return False


@lru_cache(maxsize=None)
def start_state(t, k, a):
    return solve_pre(INITIAL_CARDS, 0, 0, t, k, a)


@lru_cache(maxsize=None)
def solve_pre(cards, points, drawn, t, k, a):
    if is_overloaded(points):
        return zero_result("OVERLOAD_ZERO")

    if t == 0:
        return zero_result("NO_CHALLENGE")

    best = None
    stop_dist = one_hot(points % 11)

    claim_value = Fraction(reward(points), 1) + start_state(t - 1, k, a)[0]
    best = (claim_value, stop_dist, "CLAIM")

    if k > 0:
        double_value = Fraction(2 * reward(points), 1) + start_state(t - 1, k - 1, a)[0]
        candidate = (double_value, stop_dist, "DOUBLE_CLAIM")
        if better(candidate, best):
            best = candidate

    if drawn < 5 and sum(cards) > 0:
        if drawn <= 1:
            items = []
            for prob, next_cards_value, point in next_states(cards):
                child_value, child_dist, _ = solve_pre(next_cards_value, points + point, drawn + 1, t, k, a)
                items.append((prob, child_value, child_dist))
            draw_value, draw_dist = weighted_sum(items)
            candidate = (draw_value, draw_dist, "DRAW")
            if better(candidate, best):
                best = candidate
        elif drawn == 2:
            items0 = []
            for prob, next_cards_value, point in next_states(cards):
                child_value, child_dist, _ = solve_post(next_cards_value, points + point, 3, t, k, a, 0)
                items0.append((prob, child_value, child_dist))
            draw0_value, draw0_dist = weighted_sum(items0)
            best_draw = (draw0_value, draw0_dist, "DRAW_LOCK_0")

            if k > 0:
                items1 = []
                for prob, next_cards_value, point in next_states(cards):
                    child_value, child_dist, _ = solve_post(next_cards_value, points + point, 3, t, k, a, 1)
                    items1.append((prob, child_value, child_dist))
                draw1_value, draw1_dist = weighted_sum(items1)
                candidate = (draw1_value, draw1_dist, "DRAW_LOCK_1")
                if better(candidate, best_draw):
                    best_draw = candidate

            if better(best_draw, best):
                best = best_draw

    if a > 0 and drawn > 0:
        giveup_value, giveup_dist, _ = start_state(t, k, a - 1)
        candidate = (giveup_value, giveup_dist, "GIVE_UP")
        if better(candidate, best):
            best = candidate

    return best


@lru_cache(maxsize=None)
def solve_post(cards, points, drawn, t, k, a, locked_double):
    if is_overloaded(points):
        return zero_result("OVERLOAD_ZERO")

    if t == 0:
        return zero_result("NO_CHALLENGE")

    stop_dist = one_hot(points % 11)
    current_reward = (1 + locked_double) * reward(points)
    best = (
        Fraction(current_reward, 1) + start_state(t - 1, k - locked_double, a)[0],
        stop_dist,
        "STOP_LOCKED_DOUBLE" if locked_double else "STOP_NORMAL",
    )

    if drawn < 5 and sum(cards) > 0:
        items = []
        for prob, next_cards_value, point in next_states(cards):
            child_value, child_dist, _ = solve_post(next_cards_value, points + point, drawn + 1, t, k, a, locked_double)
            items.append((prob, child_value, child_dist))
        draw_value, draw_dist = weighted_sum(items)
        candidate = (draw_value, draw_dist, "DRAW")
        if better(candidate, best):
            best = candidate

    if a > 0:
        giveup_value, giveup_dist, _ = start_state(t, k, a - 1)
        candidate = (giveup_value, giveup_dist, "GIVE_UP")
        if better(candidate, best):
            best = candidate

    return best


def format_fraction(frac: Fraction) -> str:
    return f"{frac.numerator}/{frac.denominator}"


def main():
    total_value, distribution, action = start_state(TOTAL_CHALLENGES, TOTAL_DOUBLES, TOTAL_GIVEUPS)
    valid_mass = sum(distribution, Fraction(0, 1))

    print("=== Simple Solver Result ===")
    print(f"initial_cards      = {INITIAL_CARDS}")
    print(f"rewards            = {REWARDS}")
    print(f"challenges/doubles = {TOTAL_CHALLENGES}/{TOTAL_DOUBLES}")
    print(f"giveups            = {TOTAL_GIVEUPS}")
    print(f"overload_mode      = {OVERLOAD_MODE}")
    print(f"best_action        = {action}")
    print(f"expected_total     = {float(total_value):.6f} ({format_fraction(total_value)})")
    print(f"valid_mass         = {float(valid_mass):.8%} ({format_fraction(valid_mass)})")
    print()
    print("distribution over points mod 11:")
    for idx, prob in enumerate(distribution):
        print(f"{idx:2d}: {float(prob):.8%} ({format_fraction(prob)})")


if __name__ == "__main__":
    main()
