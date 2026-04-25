<?php
// ============================================================
// send.php — お問い合わせメール送信
// ============================================================
// ★ 以下の設定を必ず変更してください
define('MAIL_TO',   'suwasuwamochi@suwachan.sakura.ne.jp');   // 受信するメールアドレス
define('MAIL_FROM', 'noreply@suwachan.sakura.ne.jp');  // 送信元アドレス（ドメインに合わせて）
define('SITE_NAME', '審神者の道具箱');
// ============================================================

// POSTでなければトップへ
if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
    header('Location: saniwa_top.html');
    exit;
}

// ハニーポットチェック（スパム対策）
if (!empty($_POST['url'])) {
    header('Location: saniwa_top.html');
    exit;
}

// 入力値の取得・サニタイズ
function clean($key) {
    $val = isset($_POST[$key]) ? $_POST[$key] : '';
    // 改行コードを正規化（bodyのみ除く）
    $val = trim($val);
    return $val;
}

function clean_header($key) {
    $val = clean($key);
    // ヘッダーインジェクション対策
    $val = preg_replace('/[\r\n]/', '', $val);
    return $val;
}

$app      = clean_header('app');
$category = clean_header('category');
$name     = clean_header('name');
$subject  = clean_header('subject');
$body     = clean('body');
$email    = clean_header('email');

// 必須チェック
if (empty($app) || empty($category) || empty($body)) {
    header('Location: contact.html');
    exit;
}

// メールアドレス形式チェック（入力がある場合）
if (!empty($email) && !filter_var($email, FILTER_VALIDATE_EMAIL)) {
    header('Location: contact.html');
    exit;
}

// 件名の組み立て
$mail_subject = '[' . SITE_NAME . '] ';
$mail_subject .= empty($subject)
    ? $category . ' / ' . $app
    : $subject;

// 本文の組み立て
$nl = "\n";
$mail_body  = SITE_NAME . ' お問い合わせフォームより' . $nl;
$mail_body .= str_repeat('─', 30) . $nl;
$mail_body .= '対象アプリ：' . $app . $nl;
$mail_body .= 'カテゴリ　：' . $category . $nl;
$mail_body .= '件名　　　：' . (empty($subject) ? '（未入力）' : $subject) . $nl;
$mail_body .= 'お名前　　：' . (empty($name) ? '（未入力）' : $name) . $nl;
$mail_body .= '返信先　　：' . (empty($email) ? '（未入力）' : $email) . $nl;
$mail_body .= str_repeat('─', 30) . $nl;
$mail_body .= $body . $nl;
$mail_body .= str_repeat('─', 30) . $nl;
$mail_body .= '送信日時：' . date('Y-m-d H:i:s') . ' (JST)' . $nl;

// mb_send_mail でUTF-8送信
mb_language('ja');
mb_internal_encoding('UTF-8');

// 件名をRFC 2047 MIMEエンコード
$encoded_subject = mb_encode_mimeheader($mail_subject, 'UTF-8', 'B');

// ヘッダー（差出人名のみエンコード）
$from_name = mb_encode_mimeheader(SITE_NAME, 'UTF-8', 'B');
$headers  = 'From: ' . $from_name . ' <' . MAIL_FROM . '>' . "\r\n";
$headers .= 'Reply-To: ' . (!empty($email) ? $email : MAIL_FROM) . "\r\n";
$headers .= 'Content-Type: text/plain; charset=UTF-8' . "\r\n";
$headers .= 'Content-Transfer-Encoding: 8bit' . "\r\n";

// エンコードされた件名を pass（mb_send_mail が二重エンコードしないよう）
$result = mail(MAIL_TO, $encoded_subject, $mail_body, $headers);

// 送信結果に応じてリダイレクト
if ($result) {
    header('Location: complete.html');
} else {
    // 送信失敗時（必要であれば error.html を用意してもOK）
    header('Location: contact.html?error=1');
}
exit;
