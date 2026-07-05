# -*- coding: utf-8 -*-
"""
PDF志愿信息转换工具
将海南高考志愿PDF转换为Excel格式，便于后续分析
"""
import pdfplumber
import pandas as pd
import re

PDF_FILE = r'C:\Users\lhp\Desktop\printPage (1).pdf'
OUTPUT_XLSX = r'C:\Users\lhp\Desktop\printPage (1).xlsx'

def parse_pdf_volunteers():
    volunteers = []
    
    with pdfplumber.open(PDF_FILE) as pdf:
        all_lines = []
        for page in pdf.pages:
            text = page.extract_text()
            if text:
                lines = text.split('\n')
                lines = [line.strip() for line in lines if line.strip()]
                all_lines.extend(lines)
        
        i = 0
        while i < len(all_lines):
            line = all_lines[i]
            
            if line.startswith('专业1'):
                majors = {}
                subject_req = ''
                school_code = ''
                school_name_part1 = ''
                school_name_part2 = ''
                school_name_part3 = ''
                group_code = ''
                seq_num = None
                follow_adjust = ''
                
                major1_match = re.match(r'专业1\s+(\d+)(.+)', line)
                if major1_match:
                    majors[1] = (major1_match.group(1), major1_match.group(2).strip())
                
                i += 1
                if i < len(all_lines) and all_lines[i].startswith('专业2'):
                    major2_match = re.match(r'专业2\s+(\d+)(.+)', all_lines[i])
                    if major2_match:
                        majors[2] = (major2_match.group(1), major2_match.group(2).strip())
                    i += 1
                
                if i < len(all_lines) and (all_lines[i].startswith('物理') or all_lines[i].startswith('历史')):
                    subject_req = all_lines[i]
                    i += 1
                
                if i < len(all_lines):
                    current_line = all_lines[i]
                    
                    seq_match = re.match(r'^(\d+)\s+', current_line)
                    if seq_match:
                        seq_num = int(seq_match.group(1))
                        remaining = current_line[len(seq_match.group(0)):]
                    else:
                        seq_num = None
                        remaining = current_line
                    
                    code_match = re.search(r'(\d{6})', remaining)
                    if code_match:
                        school_code = code_match.group(1)
                        after_code = remaining[code_match.end():]
                        
                        bracket_match = re.search(r'\(', after_code)
                        if bracket_match:
                            school_name_part1 = after_code[:bracket_match.start()].strip()
                        else:
                            school_name_part1 = after_code.strip()
                        
                        major3_match = re.search(r'专业3\s+(\d+)(.+)', after_code)
                        if major3_match:
                            majors[3] = (major3_match.group(1), major3_match.group(2).strip())
                i += 1
                
                if i < len(all_lines):
                    current_line = all_lines[i]
                    
                    if '服从' in current_line:
                        follow_adjust = '服从'
                    
                    if seq_num is None:
                        seq_match = re.match(r'^(\d+)', current_line)
                        if seq_match:
                            seq_num = int(seq_match.group(1))
                    
                    if not school_name_part2:
                        potential_name = re.sub(r'^\d+\s*', '', current_line).strip()
                        potential_name = potential_name.replace('服从', '').strip()
                        if potential_name and not potential_name.startswith('专业'):
                            school_name_part2 = potential_name
                i += 1
                
                if i < len(all_lines):
                    current_line = all_lines[i]
                    
                    group_match = re.search(r'\((\d+)\)', current_line)
                    if group_match:
                        group_code = group_match.group(1)
                    
                    school_name_part3 = re.sub(r'\((\d+)\)', '', current_line).strip()
                    school_name_part3 = school_name_part3.replace('生均须选考', '').strip()
                i += 1
                
                if i < len(all_lines) and all_lines[i].startswith('专业4'):
                    major4_match = re.match(r'专业4\s+(\d+)(.+)', all_lines[i])
                    if major4_match:
                        majors[4] = (major4_match.group(1), major4_match.group(2).strip())
                    i += 1
                
                if i < len(all_lines) and all_lines[i].startswith('方可报考'):
                    i += 1
                
                if i < len(all_lines) and all_lines[i].startswith('专业5'):
                    major5_match = re.match(r'专业5\s+(\d+)(.+)', all_lines[i])
                    if major5_match:
                        majors[5] = (major5_match.group(1), major5_match.group(2).strip())
                    i += 1
                
                if i < len(all_lines) and all_lines[i].startswith('专业6'):
                    major6_match = re.match(r'专业6\s+(\d+)(.+)', all_lines[i])
                    if major6_match:
                        majors[6] = (major6_match.group(1), major6_match.group(2).strip())
                    i += 1
                
                school_name = school_name_part1 + school_name_part2 + school_name_part3
                school_name = school_name.replace('  ', '').strip()
                
                school_name = school_name.replace('(2门科目考', '').replace('生均须选考', '')
                school_name = school_name.replace('方可报考)', '').replace('服从', '')
                school_name = school_name.replace('(1门科目考生必须选考方可报考)', '')
                school_name = school_name.replace('选考方可报', '').replace('考)', '')
                
                school_name = re.sub(r'专业\d+\s+\d+\s+[^ ]+', '', school_name)
                school_name = school_name.replace('专业3', '').replace('专业4', '')
                school_name = school_name.replace('专业5', '').replace('专业6', '')
                
                school_name = re.sub(r'\d+\s+', '', school_name)
                school_name = re.sub(r'\s+', '', school_name).strip()
                
                major_list = []
                for idx in range(1, 7):
                    if idx in majors:
                        major_list.append({
                            'index': idx,
                            'code': majors[idx][0],
                            'name': majors[idx][1],
                        })
                
                if school_code and school_name and seq_num is not None:
                    volunteers.append({
                        'row_num': seq_num,
                        'school_code': school_code,
                        'school_name': school_name,
                        'group_code': group_code,
                        'subject_req': subject_req.strip(),
                        'majors': major_list,
                        'follow_adjust': follow_adjust,
                    })
            else:
                i += 1
    
    volunteers.sort(key=lambda x: x['row_num'])
    
    school_name_fixes = {
        15: ('杭州电子科技大学', '01'),
        18: ('中国地质大学(武汉)', '04'),
        25: ('中国石油大学(北京)', '02'),
    }
    
    for vol in volunteers:
        if vol['row_num'] in school_name_fixes:
            vol['school_name'] = school_name_fixes[vol['row_num']][0]
            vol['group_code'] = school_name_fixes[vol['row_num']][1]
    
    return volunteers

def create_excel(volunteers):
    rows = []
    
    for vol in volunteers:
        rows.append([
            vol['row_num'],
            '院校专业组',
            f"{vol['school_code']} {vol['school_name']}({vol['group_code']})",
            '是否服从',
        ])
        rows.append([
            '',
            '',
            '',
            '专业调剂',
        ])
        
        major_str = ''
        for idx in range(1, 7):
            m = next((m for m in vol['majors'] if m['index'] == idx), None)
            if m:
                major_str += f"【专业{idx}：{m['code']} {m['name']}】 "
            else:
                major_str += f"【专业{idx}： 】 "
        major_str = major_str.strip()
        
        rows.append([
            '',
            '专业',
            major_str,
            vol['follow_adjust'],
        ])
    
    df = pd.DataFrame(rows)
    df.to_excel(OUTPUT_XLSX, index=False, header=False)
    
    print(f"✅ Excel文件已生成: {OUTPUT_XLSX}")
    print(f"📊 共 {len(volunteers)} 个志愿")

def main():
    print("=" * 70)
    print("PDF志愿信息转换工具")
    print("=" * 70)
    
    print(f"\n📁 输入PDF: {PDF_FILE}")
    print(f"📁 输出Excel: {OUTPUT_XLSX}")
    
    print("\n步骤1: 解析PDF志愿数据...")
    volunteers = parse_pdf_volunteers()
    print(f"✅ 解析完成，共 {len(volunteers)} 个志愿")
    
    for vol in volunteers:
        print(f"  志愿{vol['row_num']}: {vol['school_code']} {vol['school_name']}({vol['group_code']})")
        majors_str = [f"{m['code']} {m['name']}" for m in vol['majors']]
        print(f"     专业: {majors_str}")
    
    print("\n步骤2: 生成Excel文件...")
    create_excel(volunteers)
    
    print("\n" + "=" * 70)
    print("转换完成！")
    print("=" * 70)

if __name__ == "__main__":
    main()