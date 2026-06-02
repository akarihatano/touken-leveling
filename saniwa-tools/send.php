<?php
// ============================================================
// send.php — お問い合わせメール送信
// ============================================================
// ★ 以下の設定を必ず変更してください
define('MAIL_TO',   'suwasuwamochi@suwachan.sakura.ne.jp');   // 受信するメールアドレス
define('MAIL_FROM', 'noreply@suwachan.sakura.ne.jp');  // 送信元（さくらのドメインに合わせて）
define('SITE_NAME', '審神者の道具箱');
// ============================================================

mb_language('ja');
mb_internal_encoding('UTF-8');
date_default_timezone_set('Asia/Tokyo');

if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
    header('Location: saniwa_top.html'); exit;
}

// ハニーポットチェック
if (!empty($_POST['url'])) {
    header('Location: saniwa_top.html'); exit;
}

function clean($key) {
    return trim(isset($_POST[$key]) ? $_POST[$key] : '');
}
function clean_header($key) {
    return preg_replace('/[\r\n]/', '', clean($key));
}

$app      = clean_header('app');
$category = clean_header('category');
$name     = clean_header('name');
$subject  = clean_header('subject');
$body     = str_replace("\r\n", "\n", clean('body'));
$email    = clean_header('email');

// 必須チェック
if (empty($app) || empty($category) || empty($body)) {
    header('Location: contact.html?error=invalid'); exit;
}

// メールアドレス形式チェック
if (!empty($email) && !filter_var($email, FILTER_VALIDATE_EMAIL)) {
    header('Location: contact.html?error=invalid'); exit;
}

// 端末環境情報（User-Agent）
$user_agent = isset($_SERVER['HTTP_USER_AGENT']) ? $_SERVER['HTTP_USER_AGENT'] : '（取得不可）';

// ---- 管理者宛メール ----
$mail_subject = '[' . SITE_NAME . '] ';
$mail_subject .= empty($subject) ? $category . ' / ' . $app : $subject;
$mail_subject = '=?UTF-8?B?' . base64_encode($mail_subject) . '?=';

$nl = "\n";
$mail_body  = SITE_NAME . ' お問い合わせフォームより' . $nl;
$mail_body .= str_repeat('─', 30) . $nl;
$mail_body .= '対象アプリ：' . $app . $nl;
$mail_body .= 'カテゴリ　：' . $category . $nl;
$mail_body .= '件名　　　：' . (empty($subject) ? '（未入力）' : $subject) . $nl;
$mail_body .= 'お名前　　：' . (empty($name)    ? '（未入力）' : $name)    . $nl;
$mail_body .= '返信先　　：' . (empty($email)   ? '（未入力）' : $email)   . $nl;
$mail_body .= str_repeat('─', 30) . $nl;
$mail_body .= $body . $nl;
$mail_body .= str_repeat('─', 30) . $nl;
$mail_body .= '【端末環境情報】' . $nl;
$mail_body .= $user_agent . $nl;
$mail_body .= str_repeat('─', 30) . $nl;
$mail_body .= '送信日時：' . date('Y-m-d H:i:s') . ' (JST)' . $nl;

$encoded_name = mb_encode_mimeheader(SITE_NAME, 'UTF-8', 'B');
$headers  = 'From: ' . $encoded_name . ' <' . MAIL_FROM . '>' . "\r\n";
$headers .= 'Reply-To: ' . (!empty($email) ? $email : MAIL_FROM) . "\r\n";
$headers .= 'Content-Type: text/plain; charset=UTF-8' . "\r\n";
$headers .= 'Content-Transfer-Encoding: 8bit' . "\r\n";

$result = mail(MAIL_TO, $mail_subject, $mail_body, $headers);


if ($result) {
    header('Location: complete.html');
} else {
    header('Location: contact.html?error=1');
}
exit;
