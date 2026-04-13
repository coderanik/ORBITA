import re

with open('/Users/anik/Code/ORBITA/docs/ORBITA_Complex_SQL_Queries.txt', 'r') as f:
    lines = f.readlines()

sql_blocks = []
in_sql = False
current_block = []

for line in lines:
    if line.strip() == "SQL Statement:":
        in_sql = True
        continue
    elif line.strip() == "Expected Output:":
        in_sql = False
        if current_block:
            sql_blocks.append("".join(current_block))
            current_block = []
        continue
    
    if in_sql:
        current_block.append(line)

clean_blocks = []
for block in sql_blocks:
    clean_blocks.append(block.replace('\u2028', '\n'))

with open('/Users/anik/Code/ORBITA/docs/project_review_queries.sql', 'w') as f:
    for i, block in enumerate(clean_blocks):
        f.write(f"-- ==========================================\n")
        f.write(f"-- Query Group {i+1}\n")
        f.write(f"-- ==========================================\n")
        f.write(block)
        f.write("\n\n")
