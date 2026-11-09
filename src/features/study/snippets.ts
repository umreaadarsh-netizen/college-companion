export type Snip = { id: string; title: string; code: string };

// Starter C programs for PFPS
export const starters: Snip[] = [
  { id: 's1', title: 'Hello World', code: String.raw`#include <stdio.h>

int main() {
    printf("Hello, World!\n");
    return 0;
}` },
  { id: 's2', title: 'Swap two numbers (pointers)', code: String.raw`#include <stdio.h>

void swap(int *a, int *b) {
    int t = *a;
    *a = *b;
    *b = t;
}

int main() {
    int x = 5, y = 10;
    swap(&x, &y);
    printf("x = %d, y = %d\n", x, y);
    return 0;
}` },
  { id: 's3', title: 'Factorial', code: String.raw`#include <stdio.h>

int main() {
    int n, i;
    long long f = 1;
    scanf("%d", &n);
    for (i = 1; i <= n; i++)
        f *= i;
    printf("Factorial = %lld\n", f);
    return 0;
}` },
  { id: 's4', title: 'Fibonacci series', code: String.raw`#include <stdio.h>

int main() {
    int n, i, a = 0, b = 1, c;
    scanf("%d", &n);
    for (i = 0; i < n; i++) {
        printf("%d ", a);
        c = a + b;
        a = b;
        b = c;
    }
    return 0;
}` },
  { id: 's5', title: 'Prime number check', code: String.raw`#include <stdio.h>

int main() {
    int n, i, prime = 1;
    scanf("%d", &n);
    if (n < 2) prime = 0;
    for (i = 2; i * i <= n; i++) {
        if (n % i == 0) {
            prime = 0;
            break;
        }
    }
    if (prime) printf("Prime\n");
    else printf("Not prime\n");
    return 0;
}` },
  { id: 's6', title: 'Palindrome number', code: String.raw`#include <stdio.h>

int main() {
    int n, t, rev = 0;
    scanf("%d", &n);
    t = n;
    while (t > 0) {
        rev = rev * 10 + t % 10;
        t /= 10;
    }
    if (rev == n) printf("Palindrome\n");
    else printf("Not a palindrome\n");
    return 0;
}` },
  { id: 's7', title: 'Largest element in an array', code: String.raw`#include <stdio.h>

int main() {
    int a[100], n, i, max;
    scanf("%d", &n);
    for (i = 0; i < n; i++)
        scanf("%d", &a[i]);
    max = a[0];
    for (i = 1; i < n; i++)
        if (a[i] > max) max = a[i];
    printf("Largest = %d\n", max);
    return 0;
}` },
  { id: 's8', title: 'Bubble sort', code: String.raw`#include <stdio.h>

int main() {
    int a[100], n, i, j, t;
    scanf("%d", &n);
    for (i = 0; i < n; i++)
        scanf("%d", &a[i]);
    for (i = 0; i < n - 1; i++) {
        for (j = 0; j < n - i - 1; j++) {
            if (a[j] > a[j + 1]) {
                t = a[j];
                a[j] = a[j + 1];
                a[j + 1] = t;
            }
        }
    }
    for (i = 0; i < n; i++)
        printf("%d ", a[i]);
    return 0;
}` },
  { id: 's9', title: 'Binary search (sorted array)', code: String.raw`#include <stdio.h>

int main() {
    int a[100], n, i, key, lo, hi, mid, found = -1;
    scanf("%d", &n);
    for (i = 0; i < n; i++)
        scanf("%d", &a[i]);
    scanf("%d", &key);
    lo = 0;
    hi = n - 1;
    while (lo <= hi) {
        mid = (lo + hi) / 2;
        if (a[mid] == key) {
            found = mid;
            break;
        } else if (a[mid] < key) {
            lo = mid + 1;
        } else {
            hi = mid - 1;
        }
    }
    if (found >= 0) printf("Found at index %d\n", found);
    else printf("Not found\n");
    return 0;
}` },
  { id: 's10', title: 'Reverse a string', code: String.raw`#include <stdio.h>
#include <string.h>

int main() {
    char s[100];
    int i, n;
    char t;
    scanf("%s", s);
    n = strlen(s);
    for (i = 0; i < n / 2; i++) {
        t = s[i];
        s[i] = s[n - 1 - i];
        s[n - 1 - i] = t;
    }
    printf("%s\n", s);
    return 0;
}` },
  { id: 's11', title: 'Matrix multiplication', code: String.raw`#include <stdio.h>

int main() {
    int a[10][10], b[10][10], c[10][10];
    int r1, c1, r2, c2, i, j, k;
    scanf("%d %d", &r1, &c1);
    scanf("%d %d", &r2, &c2);
    if (c1 != r2) {
        printf("Multiplication not possible\n");
        return 0;
    }
    for (i = 0; i < r1; i++)
        for (j = 0; j < c1; j++)
            scanf("%d", &a[i][j]);
    for (i = 0; i < r2; i++)
        for (j = 0; j < c2; j++)
            scanf("%d", &b[i][j]);
    for (i = 0; i < r1; i++) {
        for (j = 0; j < c2; j++) {
            c[i][j] = 0;
            for (k = 0; k < c1; k++)
                c[i][j] += a[i][k] * b[k][j];
        }
    }
    for (i = 0; i < r1; i++) {
        for (j = 0; j < c2; j++)
            printf("%d ", c[i][j]);
        printf("\n");
    }
    return 0;
}` },
  { id: 's12', title: 'Structure example', code: String.raw`#include <stdio.h>

struct Student {
    int roll;
    char name[30];
    float marks;
};

int main() {
    struct Student s;
    scanf("%d %s %f", &s.roll, s.name, &s.marks);
    printf("Roll: %d\nName: %s\nMarks: %.2f\n", s.roll, s.name, s.marks);
    return 0;
}` },
];
