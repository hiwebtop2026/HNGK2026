import requests
import json

url = 'https://gk.quark.cn/oapi/general_entity_college_domestic/getGaokaoContent'
headers = {
    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
    'referer': 'https://vt.quark.cn/',
    'origin': 'https://vt.quark.cn',
}
params = {
    'q': '北京大学',
    'query': '北京大学',
    '_chain': 'z_gaokao_content',
    'app_chain_name': 'z_gaokao_content',
    'scName': 'general_entity_college_domestic',
    'biz_id': 'general_entity_college_domestic',
    'device': 'pc',
}

print("正在获取API数据...")
response = requests.get(url, headers=headers, params=params, timeout=30)
data = response.json()

print("保存完整响应到文件...")
with open('api_response_full.json', 'w', encoding='utf-8') as f:
    json.dump(data, f, ensure_ascii=False, indent=2)
print(f"响应大小: {len(response.text)} 字节")

def find_score_data(obj, path='', depth=0, max_depth=10):
    if depth > max_depth:
        return []
    
    results = []
    
    if isinstance(obj, dict):
        for key, value in obj.items():
            new_path = f"{path}.{key}" if path else key
            
            key_lower = key.lower()
            if any(kw in key_lower for kw in ['score', 'major', 'luqu', 'fen', '录取', '分数', '专业']):
                if isinstance(value, (list, dict)):
                    results.append({
                        'path': new_path,
                        'key': key,
                        'type': type(value).__name__,
                        'size': len(str(value)) if value else 0,
                        'preview': str(value)[:200] if value else ''
                    })
            
            if isinstance(value, (dict, list)):
                results.extend(find_score_data(value, new_path, depth + 1, max_depth))
    
    elif isinstance(obj, list):
        for i, item in enumerate(obj[:5]):
            new_path = f"{path}[{i}]"
            if isinstance(item, (dict, list)):
                results.extend(find_score_data(item, new_path, depth + 1, max_depth))
    
    return results

print("\n正在搜索分数/专业相关数据...")
score_data = find_score_data(data)

if score_data:
    print(f"\n找到 {len(score_data)} 个相关数据节点:")
    for i, item in enumerate(score_data[:30]):
        print(f"\n[{i+1}] {item['path']}")
        print(f"    类型: {item['type']}, 大小: {item['size']}")
        print(f"    预览: {item['preview'][:150]}")
else:
    print("\n未找到相关数据节点")
    print("\n打印所有数据的键路径:")
    def print_keys(obj, path='', depth=0, max_depth=6):
        if depth > max_depth:
            return
        if isinstance(obj, dict):
            for key, value in obj.items():
                new_path = f"{path}.{key}" if path else key
                print(f"{'  '*depth}{key}: {type(value).__name__}", end='')
                if isinstance(value, list):
                    print(f" (长度: {len(value)})")
                elif isinstance(value, dict):
                    print(f" (键数: {len(value)})")
                elif isinstance(value, str):
                    print(f" ({len(value)}字符)")
                else:
                    print()
                if isinstance(value, (dict, list)):
                    print_keys(value, new_path, depth + 1, max_depth)
        elif isinstance(obj, list) and len(obj) > 0:
            print(f"{'  '*depth}[0]: {type(obj[0]).__name__}")
            if isinstance(obj[0], (dict, list)):
                print_keys(obj[0], f"{path}[0]", depth + 1, max_depth)
    
    print_keys(data)