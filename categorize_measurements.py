MEASUREMENTS = {
  "m1": "Ret W", "m2": "Ret D", "m3": "Sup W", "m4": "Sup D", "m5": "Ret Box W",
  "m6": "Ret Box D", "m7": "Floor H", "m8": "Return P", "m9": "Supply P", "m10": "P/D",
  "m11": "Ceil H", "m12": "Clearance", "m13": "Plenum D", "m14": "AHU D", "m15": "Clearance",
  "m16": "Ret Box D", "m17": "Clearance", "m18": "Access W", "m19": "Access D", "m20": "AHU L",
  "m21": "AHU H", "m22": "Plenum Top", "m23": "Plenum End", "m24": "Plenum B", "m25": "Plenum C",
  "m26": "Plenum D", "m27": "Attic Pitch"
}

# Grouping logic:
# Airflow / duct dimensions: m1, m2, m3, m4, m5, m6, m13, m16, m22, m23, m24, m25, m26
# Clearances: m12, m15, m17, m18, m19
# Unit Dimensions: m14 (AHU D), m20 (AHU L), m21 (AHU H) - wait they said Electrical/Line Set
# Plenums (P / D): m8, m9, m10
# Misc: m7, m11, m27

categories = {
    "Airflow & Ducting": ["m1", "m2", "m3", "m4", "m5", "m6", "m13", "m16", "m22", "m23", "m24", "m25", "m26"],
    "Clearances & Access": ["m12", "m15", "m17", "m18", "m19"],
    "Equip Dimensions": ["m14", "m20", "m21"],
    "Plenum Pressures": ["m8", "m9", "m10"],
    "Misc Site Data": ["m7", "m11", "m27"]
}

for cat, keys in categories.items():
    print(f"{cat}:")
    for k in keys:
        print(f"  {k}: {MEASUREMENTS[k]}")
