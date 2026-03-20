/* 
  TJ 탐정 사무소 - 관리자 계정 생성용 스크립트 
  아이디: admin@tj-detective.com
  비밀번호: 1234
*/

-- 1. 기존 데이터 삭제 (중복 방지 및 초기화)
-- 이메일이 'admin@tj-detective.com'인 사용자를 삭제하면 
-- 연동된 profiles 테이블 데이터도 연쇄 삭제(Cascade)됩니다.
DELETE FROM auth.users WHERE email = 'admin@tj-detective.com';

-- 2. 관리자 계정 생성 (Auth)
-- 이 쿼리가 실행되면 이전에 설정한 'on_auth_user_created' 트리거가 
-- 자동으로 public.profiles 테이블에 기본 데이터를 생성합니다.
INSERT INTO auth.users (
  id, 
  instance_id, 
  email, 
  encrypted_password, 
  email_confirmed_at, 
  raw_app_meta_data, 
  raw_user_meta_data, 
  created_at, 
  updated_at, 
  role, 
  aud,
  confirmation_token
)
VALUES (
  gen_random_uuid(),
  '00000000-0000-0000-0000-000000000000',
  'admin@tj-detective.com',
  crypt('1234', gen_salt('bf')), -- 비밀번호 '1234' 암호화
  now(),
  '{"provider":"email","providers":["email"]}',
  '{"full_name":"최고관리자"}',
  now(),
  now(),
  'authenticated',
  'authenticated',
  ''
);

-- 3. 트리거에 의해 생성된 프로필을 'admin' 권한으로 업데이트
-- 기본적으로 'customer'로 생성되므로, 여기서 'admin'으로 승격시킵니다.
UPDATE public.profiles 
SET role = 'admin',
    full_name = '최고관리자'
WHERE email = 'admin@tj-detective.com';
