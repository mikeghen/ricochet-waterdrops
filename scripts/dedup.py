# Deduplicate lines in the user-claims.txt file, over write the file with the deduplicated list
# Usage: python dedup.py

import sys

def dedup():
    with open("user-claims.txt", "r") as f:
        lines = f.readlines()
    lines_set = set(lines)
    with open("user-claims.txt", "w") as f:
        for line in lines_set:
            f.write(line)

if __name__ == "__main__":
    dedup()
