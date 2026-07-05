# -*- coding: utf-8 -*-
"""
志愿分析可视化工具
使用现代风格的图示方式展现录取概率，优化配色方案提高数据易读性
"""
import pandas as pd
import matplotlib.pyplot as plt
import matplotlib.patches as patches
import numpy as np
import os
import sys
sys.path.append(os.path.dirname(os.path.abspath(__file__)))

from analyze_excel import (
    parse_volunteer_data, get_scores_by_year, get_major_scores,
    calculate_probability, calculate_major_probability, get_school_type,
    STUDENT_INFO, INPUT_XLSX
)

plt.rcParams['font.sans-serif'] = ['Microsoft YaHei', 'SimHei', 'Arial Unicode MS']
plt.rcParams['axes.unicode_minus'] = False
plt.rcParams['figure.dpi'] = 150

COLORS = {
    '高': '#10B981',
    '偏高': '#3B82F6',
    '中': '#F59E0B',
    '偏低': '#EF4444',
    '低': '#DC2626',
    '985': '#7C3AED',
    '双一流': '#3B82F6',
    '普通本科': '#10B981',
    'bg': '#F8FAFC',
    'card': '#FFFFFF',
    'border': '#E2E8F0',
    'text': '#1E293B',
    'text_secondary': '#64748B'
}


def create_probability_chart(volunteers):
    fig, axes = plt.subplots(2, 1, figsize=(14, 16), gridspec_kw={'height_ratios': [3, 2]})
    
    ax1 = axes[0]
    ax2 = axes[1]
    
    fig.suptitle(f'海南高考志愿录取概率分析\n(考生分数: {STUDENT_INFO["score"]}分 | 位次: {STUDENT_INFO["rank"]} | 选科: {STUDENT_INFO["subjects"]})',
                 fontsize=20, fontweight='bold', color=COLORS['text'], y=0.98)
    
    school_names = [v['school_name'] for v in volunteers]
    seq_nums = [int(v['seq_num']) for v in volunteers]
    
    probabilities = []
    levels = []
    types = []
    
    for v in volunteers:
        scores = get_scores_by_year(v['school_name'], v['group_code'])
        prob, level, _ = calculate_probability(scores, get_school_type(v['school_name']), len(v['majors']))
        if prob is None:
            prob = 50
            level = '中'
        probabilities.append(prob)
        levels.append(level)
        types.append(get_school_type(v['school_name']))
    
    bar_colors = [COLORS[l] for l in levels]
    type_colors = [COLORS[t] for t in types]
    
    y_pos = np.arange(len(school_names))
    
    bars = ax1.barh(y_pos, probabilities, height=0.7, color=bar_colors, alpha=0.9, edgecolor='white', linewidth=1)
    
    for i, (bar, prob, level) in enumerate(zip(bars, probabilities, levels)):
        ax1.text(bar.get_width() + 1, bar.get_y() + bar.get_height() / 2,
                 f'{int(prob)}%', va='center', fontsize=11, fontweight='bold', color=COLORS['text'])
        
        if prob >= 85:
            label = '极高'
        elif prob >= 70:
            label = '较高'
        elif prob >= 50:
            label = '中等'
        elif prob >= 30:
            label = '较低'
        else:
            label = '极低'
        ax1.text(2, bar.get_y() + bar.get_height() / 2,
                 f'#{seq_nums[i]}', va='center', fontsize=9, color=COLORS['text_secondary'])
    
    ax1.set_yticks(y_pos)
    ax1.set_yticklabels(school_names, fontsize=12, color=COLORS['text'])
    ax1.invert_yaxis()
    
    ax1.set_xlim(0, 105)
    ax1.set_xlabel('录取概率 (%)', fontsize=14, color=COLORS['text'])
    
    ax1.axvline(85, color='#10B981', linestyle='--', alpha=0.5, linewidth=1.5)
    ax1.axvline(70, color='#3B82F6', linestyle='--', alpha=0.5, linewidth=1.5)
    ax1.axvline(50, color='#F59E0B', linestyle='--', alpha=0.5, linewidth=1.5)
    ax1.axvline(30, color='#EF4444', linestyle='--', alpha=0.5, linewidth=1.5)
    
    ax1.text(86, len(school_names) - 0.5, '极高', fontsize=10, color='#10B981', fontweight='bold')
    ax1.text(71, len(school_names) - 0.5, '较高', fontsize=10, color='#3B82F6', fontweight='bold')
    ax1.text(51, len(school_names) - 0.5, '中等', fontsize=10, color='#F59E0B', fontweight='bold')
    ax1.text(31, len(school_names) - 0.5, '较低', fontsize=10, color='#EF4444', fontweight='bold')
    ax1.text(5, len(school_names) - 0.5, '极低', fontsize=10, color='#DC2626', fontweight='bold')
    
    ax1.set_title('各院校录取概率分布', fontsize=16, fontweight='bold', color=COLORS['text'], pad=20)
    ax1.grid(axis='x', linestyle='--', alpha=0.3)
    ax1.set_facecolor(COLORS['bg'])
    
    type_counts = {'985': 0, '双一流': 0, '普通本科': 0}
    for t in types:
        type_counts[t] += 1
    
    type_labels = ['985院校', '双一流院校', '普通本科']
    type_values = [type_counts['985'], type_counts['双一流'], type_counts['普通本科']]
    type_colors_plot = [COLORS['985'], COLORS['双一流'], COLORS['普通本科']]
    
    wedges, texts, autotexts = ax2.pie(type_values, labels=type_labels, colors=type_colors_plot,
                                       autopct='%1.1f%%', startangle=90, pctdistance=0.85,
                                       textprops={'fontsize': 12, 'color': COLORS['text']})
    
    for wedge in wedges:
        wedge.set_edgecolor('white')
        wedge.set_linewidth(2)
    
    ax2.set_title('院校类型分布', fontsize=16, fontweight='bold', color=COLORS['text'], pad=20)
    
    fig.patch.set_facecolor(COLORS['bg'])
    
    plt.tight_layout(rect=[0, 0.03, 1, 0.95])
    
    return fig


def create_score_trend_chart(volunteers):
    fig, ax = plt.subplots(figsize=(16, 10))
    
    ax.set_title('近三年录取分数线趋势对比', fontsize=18, fontweight='bold', color=COLORS['text'], pad=20)
    
    years = [2023, 2024, 2025]
    student_score = STUDENT_INFO['score']
    
    colors = plt.cm.tab20(np.linspace(0, 1, len(volunteers)))
    
    for i, v in enumerate(volunteers):
        scores = get_scores_by_year(v['school_name'], v['group_code'])
        score_values = []
        for year in years:
            score_values.append(scores.get(year, np.nan))
        
        if not all(np.isnan(s) for s in score_values):
            ax.plot(years, score_values, marker='o', linewidth=2.5, markersize=8,
                    label=f'#{int(v["seq_num"])} {v["school_name"]}', color=colors[i], alpha=0.8)
    
    ax.axhline(y=student_score, color='#EF4444', linestyle='-.', linewidth=3, alpha=0.8,
               label=f'你的分数: {student_score}分')
    
    ax.set_xlabel('年份', fontsize=14, color=COLORS['text'])
    ax.set_ylabel('录取分数线', fontsize=14, color=COLORS['text'])
    
    ax.set_xticks(years)
    ax.set_xticklabels([str(y) for y in years], fontsize=12)
    
    ax.grid(True, linestyle='--', alpha=0.3)
    ax.set_facecolor(COLORS['bg'])
    fig.patch.set_facecolor(COLORS['bg'])
    
    ax.legend(loc='upper left', bbox_to_anchor=(1, 1), fontsize=10, title='院校', title_fontsize=12,
              framealpha=0.9, facecolor=COLORS['card'], edgecolor=COLORS['border'])
    
    plt.tight_layout()
    
    return fig


def create_major_probability_chart(volunteers, top_n=10):
    all_majors = []
    
    for v in volunteers:
        for m in v['majors']:
            major_scores = get_major_scores(v['school_name'], m['name'])
            prob, level, _ = calculate_major_probability(major_scores, STUDENT_INFO['score'])
            if prob is not None:
                all_majors.append({
                    'school': v['school_name'],
                    'major': m['name'],
                    'prob': prob,
                    'level': level
                })
    
    all_majors.sort(key=lambda x: x['prob'], reverse=True)
    top_majors = all_majors[:top_n]
    
    fig, ax = plt.subplots(figsize=(14, 8))
    
    y_pos = np.arange(len(top_majors))
    probs = [m['prob'] for m in top_majors]
    labels = [f"{m['school']}\n{m['major']}" for m in top_majors]
    colors = [COLORS[m['level']] for m in top_majors]
    
    bars = ax.barh(y_pos, probs, height=0.6, color=colors, alpha=0.9, edgecolor='white', linewidth=1)
    
    for bar, prob in zip(bars, probs):
        ax.text(bar.get_width() + 1, bar.get_y() + bar.get_height() / 2,
                f'{int(prob)}%', va='center', fontsize=11, fontweight='bold', color=COLORS['text'])
    
    ax.set_yticks(y_pos)
    ax.set_yticklabels(labels, fontsize=11, color=COLORS['text'])
    ax.invert_yaxis()
    
    ax.set_xlim(0, 105)
    ax.set_xlabel('专业录取概率 (%)', fontsize=14, color=COLORS['text'])
    
    ax.set_title(f'专业录取概率TOP{top_n}', fontsize=16, fontweight='bold', color=COLORS['text'], pad=20)
    ax.grid(axis='x', linestyle='--', alpha=0.3)
    ax.set_facecolor(COLORS['bg'])
    fig.patch.set_facecolor(COLORS['bg'])
    
    plt.tight_layout()
    
    return fig


def create_probability_distribution_chart(volunteers):
    probabilities = []
    
    for v in volunteers:
        scores = get_scores_by_year(v['school_name'], v['group_code'])
        prob, level, _ = calculate_probability(scores, get_school_type(v['school_name']), len(v['majors']))
        if prob is None:
            prob = 50
        probabilities.append(prob)
    
    bins = [0, 20, 40, 60, 80, 100]
    labels = ['0-20%', '20-40%', '40-60%', '60-80%', '80-100%']
    
    fig, ax = plt.subplots(figsize=(12, 7))
    
    counts, _ = np.histogram(probabilities, bins=bins)
    bar_colors = ['#DC2626', '#EF4444', '#F59E0B', '#3B82F6', '#10B981']
    
    bars = ax.bar(labels, counts, color=bar_colors, alpha=0.9, edgecolor='white', linewidth=1.5)
    
    for bar, count in zip(bars, counts):
        ax.text(bar.get_x() + bar.get_width() / 2, bar.get_height() + 0.2,
                str(count), ha='center', fontsize=12, fontweight='bold', color=COLORS['text'])
    
    ax.set_xlabel('录取概率区间', fontsize=14, color=COLORS['text'])
    ax.set_ylabel('志愿数量', fontsize=14, color=COLORS['text'])
    
    ax.set_title('录取概率分布统计', fontsize=16, fontweight='bold', color=COLORS['text'], pad=20)
    
    ax.grid(axis='y', linestyle='--', alpha=0.3)
    ax.set_facecolor(COLORS['bg'])
    fig.patch.set_facecolor(COLORS['bg'])
    
    avg_prob = np.mean(probabilities)
    ax.axhline(y=avg_prob / 10, color='#64748B', linestyle='--', alpha=0.7,
               label=f'平均概率: {avg_prob:.1f}%')
    ax.legend()
    
    plt.tight_layout()
    
    return fig


def create_volunteer_radar_chart(volunteers):
    labels = ['录取概率', '学校层次', '专业数量', '分数优势', '地域优势']
    num_vars = len(labels)
    
    angles = np.linspace(0, 2 * np.pi, num_vars, endpoint=False).tolist()
    angles += angles[:1]
    
    fig, ax = plt.subplots(figsize=(10, 10), subplot_kw=dict(polar=True))
    
    volunteer_scores = []
    
    for v in volunteers:
        scores = get_scores_by_year(v['school_name'], v['group_code'])
        prob, level, _ = calculate_probability(scores, get_school_type(v['school_name']), len(v['majors']))
        if prob is None:
            prob = 50
        
        school_level = 100 if get_school_type(v['school_name']) == '985' else 75 if get_school_type(v['school_name']) == '双一流' else 50
        major_count = min(len(v['majors']) / 6 * 100, 100)
        
        last_score = scores.get(2025, scores.get(2024, scores.get(2023, 650)))
        score_advantage = min(max((STUDENT_INFO['score'] - last_score + 50) / 100 * 100, 0), 100)
        
        location_score = 70
        
        volunteer_scores.append([prob, school_level, major_count, score_advantage, location_score])
    
    avg_scores = np.mean(volunteer_scores, axis=0)
    avg_scores = np.append(avg_scores, avg_scores[0])
    
    ax.plot(angles, avg_scores, linewidth=2, linestyle='solid', label='平均水平', color='#3B82F6')
    ax.fill(angles, avg_scores, alpha=0.2, color='#3B82F6')
    
    ax.set_xticks(angles[:-1])
    ax.set_xticklabels(labels, fontsize=12, color=COLORS['text'])
    
    ax.set_ylim(0, 100)
    ax.set_yticks([20, 40, 60, 80, 100])
    ax.set_yticklabels(['20', '40', '60', '80', '100'], fontsize=10, color=COLORS['text_secondary'])
    
    ax.set_title('志愿综合评估雷达图', fontsize=16, fontweight='bold', color=COLORS['text'], pad=30)
    
    ax.legend(loc='upper right', fontsize=12)
    
    ax.set_facecolor(COLORS['bg'])
    fig.patch.set_facecolor(COLORS['bg'])
    
    plt.tight_layout()
    
    return fig


def save_all_charts(volunteers, output_dir):
    if not os.path.exists(output_dir):
        os.makedirs(output_dir)
    
    fig1 = create_probability_chart(volunteers)
    fig1.savefig(os.path.join(output_dir, '01_录取概率分布.png'), dpi=150, bbox_inches='tight', facecolor=COLORS['bg'])
    plt.close(fig1)
    print(f'✅ 已保存: {os.path.join(output_dir, "01_录取概率分布.png")}')
    
    fig2 = create_score_trend_chart(volunteers)
    fig2.savefig(os.path.join(output_dir, '02_分数线趋势.png'), dpi=150, bbox_inches='tight', facecolor=COLORS['bg'])
    plt.close(fig2)
    print(f'✅ 已保存: {os.path.join(output_dir, "02_分数线趋势.png")}')
    
    fig3 = create_major_probability_chart(volunteers)
    fig3.savefig(os.path.join(output_dir, '03_专业录取概率TOP10.png'), dpi=150, bbox_inches='tight', facecolor=COLORS['bg'])
    plt.close(fig3)
    print(f'✅ 已保存: {os.path.join(output_dir, "03_专业录取概率TOP10.png")}')
    
    fig4 = create_probability_distribution_chart(volunteers)
    fig4.savefig(os.path.join(output_dir, '04_概率分布统计.png'), dpi=150, bbox_inches='tight', facecolor=COLORS['bg'])
    plt.close(fig4)
    print(f'✅ 已保存: {os.path.join(output_dir, "04_概率分布统计.png")}')
    
    fig5 = create_volunteer_radar_chart(volunteers)
    fig5.savefig(os.path.join(output_dir, '05_综合评估雷达图.png'), dpi=150, bbox_inches='tight', facecolor=COLORS['bg'])
    plt.close(fig5)
    print(f'✅ 已保存: {os.path.join(output_dir, "05_综合评估雷达图.png")}')
    
    print(f'\n📁 所有图表已保存到: {output_dir}')


def main():
    df = pd.read_excel(INPUT_XLSX, header=None)
    volunteers = parse_volunteer_data(df)
    
    output_dir = r'C:\Users\lhp\Desktop\志愿分析图表'
    save_all_charts(volunteers, output_dir)
    
    print(f'\n🎉 志愿分析可视化完成！')
    print(f'📊 共生成5张分析图表')
    print(f'📁 输出目录: {output_dir}')


if __name__ == "__main__":
    main()