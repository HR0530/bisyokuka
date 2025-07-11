const tree = {
  q: "温かい料理が食べたいですか？",
  yes: {
    q: "ご飯料理が食べたいですか？",
    yes: {
      q: "和食が良いですか？",
      yes: {
        q: "丼ものが好きですか？",
        yes: {
          q: "揚げ物入りが好きですか？",
          yes: { result: "カツ丼", ingredients: ["ご飯", "豚カツ", "卵", "玉ねぎ", "だし", "醤油", "みりん"], steps: [
            "玉ねぎをだし、醤油、みりんで煮る。",
            "豚カツを加え卵でとじる。",
            "ご飯にのせて完成。"
          ]},
          no: { result: "親子丼", ingredients: ["ご飯", "鶏肉", "卵", "玉ねぎ", "だし", "醤油", "みりん"], steps: [
            "鶏肉と玉ねぎを煮る。",
            "卵を流し入れて半熟に。",
            "ご飯にのせて完成。"
          ]}
        },
        no: {
          q: "味噌味が好きですか？",
          yes: { result: "鮭の味噌漬け焼き", ingredients: ["鮭", "味噌", "みりん", "砂糖"], steps: [
            "味噌、みりん、砂糖を混ぜ鮭に塗る。",
            "冷蔵庫で漬けてから焼く。"
          ]},
          no: { result: "焼き魚定食", ingredients: ["魚", "塩"], steps: [
            "魚に塩を振り焼く。"
          ]}
        }
      },
      no: {
        q: "中華風ご飯が食べたいですか？",
        yes: {
          q: "チャーハンが好き？",
          yes: { result: "チャーハン", ingredients: ["ご飯", "卵", "ねぎ", "チャーシュー", "醤油"], steps: [
            "卵を炒め、ご飯と具材を混ぜる。",
            "醤油で味付けし炒める。"
          ]},
          no: { result: "麻婆豆腐丼", ingredients: ["ご飯", "豆腐", "豚ひき肉", "豆板醤", "甜麺醤", "にんにく"], steps: [
            "豚肉を炒め豆板醤、甜麺醤を加える。",
            "豆腐を入れて煮る。",
            "ご飯にかけて完成。"
          ]}
        },
        no: {
          q: "洋風ご飯が良いですか？",
          yes: {
            q: "クリーム系が好きですか？",
            yes: { result: "チキンライス", ingredients: ["ご飯", "鶏肉", "ケチャップ", "玉ねぎ"], steps: [
              "鶏肉と玉ねぎを炒める。",
              "ご飯を加えケチャップで味付け。"
            ]},
            no: { result: "ドライカレー", ingredients: ["ご飯", "ひき肉", "カレー粉", "玉ねぎ"], steps: [
              "ひき肉と玉ねぎを炒めカレー粉で味付け。",
              "ご飯を混ぜて完成。"
            ]}
          },
          no: {
            result: "ピラフ",
            ingredients: ["米", "鶏肉", "玉ねぎ", "コンソメ"],
            steps: [
              "玉ねぎと鶏肉を炒める。",
              "米とコンソメを加え炊く。"
            ]
          }
        }
      }
    },
    no: {
      q: "麺類が食べたいですか？",
      yes: {
        q: "中華麺系ですか？",
        yes: {
          q: "ラーメンが好きですか？",
          yes: {
            q: "醤油味ですか？",
            yes: { result: "醤油ラーメン", ingredients: ["中華麺", "鶏ガラスープ", "醤油", "チャーシュー", "メンマ"], steps: [
              "スープを作り麺を茹でる。",
              "器に麺とスープを入れ具材を盛る。"
            ]},
            no: {
              q: "味噌味ですか？",
              yes: { result: "味噌ラーメン", ingredients: ["中華麺", "味噌", "豚肉", "もやし"], steps: [
                "味噌スープを作り麺を茹でる。",
                "具材をのせる。"
              ]},
              no: { result: "塩ラーメン", ingredients: ["中華麺", "鶏ガラスープ", "塩", "ネギ"], steps: [
                "塩スープを作り麺を茹でる。",
                "具材をのせて完成。"
              ]}
            }
          },
          no: {
            q: "冷やし中華は好きですか？",
            yes: { result: "冷やし中華", ingredients: ["中華麺", "きゅうり", "ハム", "錦糸卵", "タレ"], steps: [
              "麺を茹で冷やす。",
              "具材をのせタレをかける。"
            ]},
            no: { result: "焼きそば", ingredients: ["中華麺", "豚肉", "キャベツ", "ソース"], steps: [
              "麺と具材を炒めソースで味付け。"
            ]}
          }
        },
        no: {
          q: "うどんですか？",
          yes: {
            q: "温かいうどん？",
            yes: { result: "かけうどん", ingredients: ["うどん", "だし", "ねぎ"], steps: [
              "うどんを茹でだしをかける。",
              "ねぎを散らす。"
            ]},
            no: { result: "ざるうどん", ingredients: ["うどん", "つゆ", "わさび"], steps: [
              "うどんを茹で冷やす。",
              "つゆにつけて食べる。"
            ]}
          },
          no: {
            q: "そばは好きですか？",
            yes: {
              q: "温かいそば？",
              yes: { result: "かけそば", ingredients: ["そば", "だし", "ねぎ"], steps: [
                "そばを茹でだしをかける。",
                "ねぎを散らす。"
              ]},
              no: { result: "ざるそば", ingredients: ["そば", "つゆ", "わさび"], steps: [
                "そばを茹で冷やす。",
                "つゆにつけて食べる。"
              ]}
            },
            no: {
              result: "スパゲティ",
              ingredients: ["パスタ", "トマトソース", "にんにく", "オリーブオイル"],
              steps: [
                "パスタを茹でる。",
                "トマトソースを作り絡める。"
              ]
            }
          }
        }
      },
      no: {
        q: "スープや鍋物が食べたいですか？",
        yes: {
          q: "和風鍋が良いですか？",
          yes: { result: "寄せ鍋", ingredients: ["魚介", "野菜", "だし", "豆腐"], steps: [
            "だしで具材を煮る。",
            "ポン酢などで食べる。"
          ]},
          no: {
            q: "洋風鍋ですか？",
            yes: { result: "チーズフォンデュ", ingredients: ["チーズ", "パン", "野菜", "白ワイン"], steps: [
              "チーズとワインを溶かす。",
              "パンや野菜をつけて食べる。"
            ]},
            no: { result: "韓国風鍋", ingredients: ["豚肉", "キムチ", "豆腐", "野菜"], steps: [
              "キムチ鍋の具材を煮る。",
              "辛味噌で味付け。"
            ]}
          }
        },
        no: {
          q: "揚げ物が食べたいですか？",
          yes: {
            q: "鶏肉の唐揚げ？",
            yes: { result: "鶏の唐揚げ", ingredients: ["鶏肉", "醤油", "にんにく", "片栗粉"], steps: [
              "鶏肉を醤油とにんにくで漬ける。",
              "片栗粉をつけて揚げる。"
            ]},
            no: {
              q: "魚のフライですか？",
              yes: { result: "白身魚フライ", ingredients: ["白身魚", "小麦粉", "卵", "パン粉"], steps: [
                "魚に衣をつけて揚げる。"
              ]},
              no: { result: "天ぷら", ingredients: ["海老", "野菜", "天ぷら粉"], steps: [
                "衣をつくり具材を揚げる。"
              ]}
            }
          },
          no: {
            result: "サラダ",
            ingredients: ["レタス", "トマト", "きゅうり", "ドレッシング"],
            steps: [
              "野菜を切って盛り付ける。",
              "ドレッシングをかける。"
            ]
          }
        }
      }
    }
  },
  no: {
    q: "冷たい料理が食べたいですか？",
    yes: {
      q: "麺類ですか？",
      yes: {
        q: "冷やし中華？",
        yes: { result: "冷やし中華", ingredients: ["中華麺", "きゅうり", "ハム", "錦糸卵", "タレ"], steps: [
          "麺を茹で冷やす。",
          "具材をのせタレをかける。"
        ]},
        no: { result: "冷製パスタ", ingredients: ["パスタ", "トマト", "バジル", "オリーブオイル"], steps: [
          "パスタを茹で冷やす。",
          "ソースと和える。"
        ]}
      },
      no: {
        q: "サラダですか？",
        yes: {
          q: "シーザーサラダ？",
          yes: { result: "シーザーサラダ", ingredients: ["レタス", "クルトン", "パルメザン", "シーザードレッシング"], steps: [
            "レタスを切る。",
            "ドレッシングをかける。",
            "クルトンとパルメザンをのせる。"
          ]},
          no: { result: "ポテトサラダ", ingredients: ["じゃがいも", "マヨネーズ", "きゅうり", "にんじん"], steps: [
            "じゃがいもを茹で潰す。",
            "他の材料を混ぜる。"
          ]}
        },
        no: { result: "フルーツ盛り合わせ", ingredients: ["季節のフルーツ"], steps: [
          "フルーツを切って盛り付ける。"
        ]}
      }
    },
    no: {
      q: "パン系の軽食が良いですか？",
      yes: {
        q: "甘いものが良いですか？",
        yes: { result: "フレンチトースト", ingredients: ["パン", "卵", "牛乳", "砂糖", "バター"], steps: [
          "卵、牛乳、砂糖を混ぜる。",
          "パンを浸す。",
          "バターで焼く。"
        ]},
        no: {
          q: "サンドイッチ？",
          yes: { result: "サンドイッチ", ingredients: ["パン", "ハム", "チーズ", "レタス", "マヨネーズ"], steps: [
            "パンに具を挟む。"
          ]},
          no: { result: "ホットドッグ", ingredients: ["ホットドッグパン", "ソーセージ", "ケチャップ", "マスタード"], steps: [
            "ソーセージを焼く。",
            "パンに挟みケチャップなどをかける。"
          ]}
        }
      },
      no: {
        result: "おにぎり", ingredients: ["ご飯", "塩", "海苔", "具材"], steps: [
          "ご飯を塩で味付け。",
          "具を入れて握る。",
          "海苔を巻く。"
        ]
      }
    }
  }
};

let current = tree;

function handleAnswer(answer) {
  if (current.result) return;

  current = answer ? current.yes : current.no;

  if (!current) {
    document.getElementById("question").textContent = "質問の選択肢がありません。";
    document.getElementById("buttons").style.display = "none";
    return;
  }

  if (current.result) {
    document.getElementById("question").style.display = "none";
    document.getElementById("buttons").style.display = "none";
    const r = current;
    document.getElementById("result").style.display = "block";
    document.getElementById("result").innerHTML = `
      <h2>🍛 あなたにおすすめの料理は：${r.result}</h2>
      <div class="recipe-section">
        <h3>材料</h3>
        <ul>${r.ingredients.map(i => `<li>${i}</li>`).join('')}</ul>
      </div>
      <div class="recipe-section">
        <h3>作り方</h3>
        <ol>${r.steps.map(s => `<li>${s}</li>`).join('')}</ol>
      </div>
    `;
  } else {
    document.getElementById("question").textContent = current.q;
  }
}

// 初期表示
document.getElementById("question").textContent = tree.q;
