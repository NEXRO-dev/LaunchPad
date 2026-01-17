# Nexro Submit

Expo React Native プロジェクトを Mac 上でビルドし、App Store Connect にアップロードするための CLI + Server + Runner システム。

## 概要

```
┌─────────┐      ┌────────────┐      ┌─────────┐      ┌─────────────┐
│   CLI   │─────▶│   Server   │─────▶│  Redis  │◀─────│   Runner    │
│         │      │  (Fastify) │      │ (Queue) │      │  (Worker)   │
└─────────┘      └────────────┘      └─────────┘      └─────────────┘
                                                             │
                                                             ▼
                                                      ┌─────────────┐
                                                      │   Pipeline  │
                                                      ├─────────────┤
                                                      │ 0. Prepare  │
                                                      │ 1. Install  │
                                                      │ 2. Prebuild │
                                                      │ 3. Pods     │
                                                      │ 4. Sign     │
                                                      │ 5. Build    │
                                                      │ 6. Upload   │
                                                      │ 7. Cleanup  │
                                                      └─────────────┘
```

## 前提条件

### macOS 環境

- **macOS** 13 (Ventura) 以降
- **Xcode** 15+（Command Line Tools 含む）
- **Node.js** 20+
- **pnpm** 9+

### 必要なツール

```bash
# Homebrew (未インストールの場合)
/bin/bash -c "$(curl -fsSL https://raw.githubusercontent.com/Homebrew/install/HEAD/install.sh)"

# CocoaPods
sudo gem install cocoapods

# fastlane
brew install fastlane

# Redis
brew install redis

# Transporter (Mac App Store からインストール)
# https://apps.apple.com/app/transporter/id1450874784
```

### Apple Developer 設定

1. **Apple Developer Program** に登録
2. **App Store Connect API Key** を作成
   - [App Store Connect](https://appstoreconnect.apple.com/) > Users and Access > Keys
   - API キー（.p8 ファイル）をダウンロード
3. **fastlane match** の設定
   - 証明書を保存する Git リポジトリを用意
   - [match ドキュメント](https://docs.fastlane.tools/actions/match/)

## セットアップ

### 1. リポジトリのクローン

```bash
git clone <repository-url>
cd nexro-submit
```

### 2. 依存関係のインストール

```bash
pnpm install
```

### 3. 環境変数の設定

```bash
cp .env.example .env
```

`.env` を編集して以下を設定：

| 変数 | 説明 |
|------|------|
| `API_KEY` | サーバー認証用 API キー |
| `APP_IDENTIFIER` | アプリのバンドル ID（例: com.example.app） |
| `TEAM_ID` | Apple Developer Team ID |
| `MATCH_GIT_URL` | match 証明書リポジトリの URL |
| `MATCH_PASSWORD` | match 暗号化パスワード |
| `ASC_KEY_ID` | App Store Connect API Key ID |
| `ASC_ISSUER_ID` | App Store Connect Issuer ID |
| `ASC_KEY_PATH` | API キー (.p8) ファイルへのパス |

### 4. ディレクトリの作成

```bash
mkdir -p packages/server/logs packages/server/artifacts
```

## 起動方法

### Terminal 1: Redis

```bash
redis-server
```

### Terminal 2: Server

```bash
cd packages/server
pnpm dev
```

### Terminal 3: Runner

```bash
cd packages/runner
pnpm dev
```

## CLI の使用方法

### ビルドして CLI をグローバルにリンク

```bash
cd packages/cli
pnpm build
npm link
```

### iOS ビルド & アップロード

```bash
# 基本的な使用法
nexro-submit ios \
  --project /path/to/your/expo-project \
  --version 1.0.0 \
  --build 1 \
  --message "Initial release"

# 完了まで待機する場合
nexro-submit ios \
  --project /path/to/your/expo-project \
  --version 1.0.0 \
  --build 1 \
  --wait
```

### ステータス確認

```bash
nexro-submit status <jobId>
```

### ログ確認

```bash
nexro-submit logs <jobId>
```

## プロジェクト構造

```
nexro-submit/
├── package.json           # ワークスペースルート
├── pnpm-workspace.yaml
├── tsconfig.json          # 共通 TypeScript 設定
├── .env.example
├── README.md
└── packages/
    ├── cli/               # コマンドラインツール
    │   ├── src/
    │   │   ├── index.ts
    │   │   ├── api.ts
    │   │   └── commands/
    │   │       ├── ios.ts
    │   │       ├── status.ts
    │   │       └── logs.ts
    │   └── package.json
    ├── server/            # API サーバー
    │   ├── src/
    │   │   ├── index.ts
    │   │   ├── queue.ts
    │   │   ├── auth.ts
    │   │   ├── types.ts
    │   │   └── routes/
    │   │       └── jobs.ts
    │   ├── logs/          # ビルドログ
    │   ├── artifacts/     # IPA ファイル
    │   └── package.json
    └── runner/            # ビルドワーカー
        ├── src/
        │   ├── index.ts
        │   ├── worker.ts
        │   ├── logger.ts
        │   ├── exec.ts
        │   └── pipeline/
        │       ├── index.ts
        │       ├── prepare.ts
        │       ├── install.ts
        │       ├── prebuild.ts
        │       ├── pods.ts
        │       ├── signing.ts
        │       ├── build.ts
        │       ├── upload.ts
        │       └── cleanup.ts
        └── package.json
```

## API エンドポイント

### POST /jobs/ios

iOS ビルドジョブを作成。

```bash
curl -X POST http://localhost:3000/jobs/ios \
  -H "Content-Type: application/json" \
  -H "x-api-key: your-api-key" \
  -d '{
    "projectPath": "/path/to/expo-project",
    "version": "1.0.0",
    "buildNumber": "1",
    "message": "Release notes"
  }'
```

**レスポンス:**
```json
{ "jobId": "abc123xyz456" }
```

### GET /jobs/:jobId

ジョブステータスを取得。

```bash
curl http://localhost:3000/jobs/abc123xyz456 \
  -H "x-api-key: your-api-key"
```

**レスポンス:**
```json
{
  "jobId": "abc123xyz456",
  "status": "building",
  "startedAt": "2024-01-15T10:00:00.000Z"
}
```

### GET /jobs/:jobId/logs

ビルドログを取得。

```bash
curl http://localhost:3000/jobs/abc123xyz456/logs \
  -H "x-api-key: your-api-key"
```

## トラブルシューティング

### fastlane match が失敗する

- SSH キーが Git リポジトリにアクセスできることを確認
- `MATCH_PASSWORD` が正しいことを確認

### Transporter でアップロードが失敗する

- Transporter アプリがインストールされていることを確認
- ASC API キーの権限を確認（Admin または App Manager）

### ビルドがタイムアウトする

- Runner の `lockDuration` を調整（デフォルト: 1時間）
- 複雑なプロジェクトの場合は時間がかかる場合があります

## V2 への拡張予定

- [ ] プロジェクトの S3 アップロード（リモートビルド対応）
- [ ] Android ビルドサポート
- [ ] Web UI ダッシュボード
- [ ] PostgreSQL でのジョブ永続化
- [ ] Webhook 通知

## ライセンス

MIT
