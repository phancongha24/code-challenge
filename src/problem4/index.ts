/**
 * Problem 4: Three ways to sum to n
 *
 * Each function provides a different approach to calculate the sum from 1 to n
 * with different time and space complexities.
 */

/**
 * Implementation A: Iterative approach using a for loop
 * Time Complexity: O(n) - Linear time as we iterate through all numbers from 1 to n
 * Space Complexity: O(1) - Constant space as we only use a single variable for accumulation
 */
function sum_to_n_a(n: number): number {
    let sum = 0;
    for (let i = 1; i <= n; i++) {
        sum += i;
    }
    return sum;
}

/**
 * Implementation B: Mathematical formula approach
 * Time Complexity: O(1) - Constant time as we perform only one calculation
 * Space Complexity: O(1) - Constant space as we use no additional variables
 *
 * This uses the mathematical formula: sum = n(n+1)/2
 */
function sum_to_n_b(n: number): number {
    return (n * (n + 1)) / 2;
}

/**
 * Implementation C: Recursive approach
 * Time Complexity: O(n) - Linear time as we make n recursive calls
 * Space Complexity: O(n) - Linear space due to the call stack (each recursive call adds a frame)
 *
 * This approach demonstrates recursion
 */
function sum_to_n_c(n: number): number {
    if (n <= 0) {
        return 0;
    }
    if (n === 1) {
        return 1;
    }
    return n + sum_to_n_c(n - 1);
}

function runTests() {
    console.log("Testing sum_to_n implementations:");

    const testCases = [0, 1, 5, 10, 100];

    testCases.forEach(n => {
        const resultA = sum_to_n_a(n);
        const resultB = sum_to_n_b(n);
        const resultC = sum_to_n_c(n);
        if (resultA === resultB && resultB === resultC) {
            console.log(`✓ All implementations match for n=${n}`);
        } else {
            console.log(`✗ Mismatch for n=${n}`);
        }
    });
}

runTests();