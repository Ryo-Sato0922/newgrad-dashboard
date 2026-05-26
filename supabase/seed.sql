insert into companies (id, name, industry, owner, email, status, client_phase, expected_mrr, contract_months, success_fee, expected_hires, initial_meeting_date, application_received_date, proposal_date, contract_target_date, contract_start_date, lost_reason, memo, sales_hours, cs_hours, acquisition_cost) values
('00000000-0000-0000-0000-000000000001', 'サクラフーズ', '外食', '高橋 美咲', 'misaki.takahashi@sakura-foods.jp', '受注', 'P7', 320000, 12, 450000, 4, '2026-03-06', '2026-03-24', '2026-03-06', '2026-03-24', '2026-04-01', null, 'リピート勤務者の店長面談化に強い関心。', 26, 18, 210000),
('00000000-0000-0000-0000-000000000002', 'ミナト物流', '物流', '佐藤 蓮', 'ren.sato@minato-logi.jp', '受注', 'P7', 260000, 12, 400000, 3, '2026-03-10', '2026-04-03', '2026-03-10', '2026-04-03', '2026-04-15', null, '職場体験後の安全理解度と志望度変化を重視。', 22, 15, 180000),
('00000000-0000-0000-0000-000000000003', 'Kanto Retail Partners', '小売', '山本 葵', 'aoi.yamamoto@krp.co.jp', 'PoC', 'P3', 180000, 6, 350000, 2, '2026-04-02', null, '2026-04-02', '2026-05-25', null, null, '店舗別に職場体験の評価差を見たい。', 19, 11, 150000),
('00000000-0000-0000-0000-000000000004', '東都ホテルズ', 'ホテル', '井上 大地', 'daichi.inoue@toto-hotels.jp', '契約交渉', 'P6', 300000, 12, 500000, 5, '2026-04-12', null, '2026-04-12', '2026-06-01', null, null, '接客職の仕事内容理解を上げ、選考辞退を減らしたい。', 24, 12, 190000),
('00000000-0000-0000-0000-000000000005', 'Green Care Works', '介護', '小林 直人', 'naoto.kobayashi@gcw.jp', '提案中', 'P2', 220000, 9, 420000, 4, '2026-05-02', null, '2026-05-02', '2026-06-20', null, null, '体験前後の心理的ハードル低下を示せると刺さる。', 15, 8, 130000);

insert into worker_funnels (company_id, month, braze_deliveries, calls, survey_interviews, views, applications, shifts, repeat_shifts, interview_requests, screenings, offers, joins, previous_month_applications) values
('00000000-0000-0000-0000-000000000001', '2026-05-01', 1200, 80, 45, 1420, 218, 126, 54, 31, 22, 8, 5, 172),
('00000000-0000-0000-0000-000000000002', '2026-05-01', 820, 64, 32, 980, 151, 86, 39, 21, 15, 5, 3, 118),
('00000000-0000-0000-0000-000000000003', '2026-05-01', 610, 42, 20, 720, 92, 49, 18, 12, 8, 2, 1, 74),
('00000000-0000-0000-0000-000000000004', '2026-05-01', 700, 58, 27, 810, 105, 58, 25, 17, 10, 3, 2, 81),
('00000000-0000-0000-0000-000000000005', '2026-05-01', 430, 36, 18, 540, 69, 32, 14, 9, 5, 1, 1, 52);

insert into student_surveys (company_id, worker_segment, desire_before, desire_after, company_understanding, employee_understanding, repeat_intent, screening_intent, comment, repeat_shift_count, offer, join_plan) values
('00000000-0000-0000-0000-000000000001', '文系・接客経験あり', 58, 82, 86, 84, 88, 76, '社員の雰囲気が想像より良く、店長候補の仕事が具体的に見えた。', 3, true, true),
('00000000-0000-0000-0000-000000000002', '文系・物流経験あり', 46, 78, 80, 77, 82, 68, '安全教育の丁寧さで印象が変わった。', 4, true, true),
('00000000-0000-0000-0000-000000000005', '福祉系・資格検討', 39, 72, 76, 80, 79, 65, '介護のイメージが変わった。利用者との距離感が印象的。', 2, false, false);

insert into kpi_snapshots (month, companies, proposals, mrr, success_fees, referrals, experience_shifts, interviews, offers, joins, gross_profit) values
('2026-03-01', 0, 3, 0, 0, 110, 52, 8, 1, 0, -720000),
('2026-04-01', 2, 6, 580000, 1200000, 318, 176, 36, 10, 5, 520000),
('2026-05-01', 3, 7, 780000, 1960000, 875, 464, 115, 23, 14, 1420000);

insert into unit_economics (month, operating_cost, gross_margin_rate, cohort, cohort_companies, retained_companies) values
('2026-03-01', 860000, 0.62, 'Mar', 3, 2),
('2026-04-01', 940000, 0.67, 'Apr', 4, 3),
('2026-05-01', 1080000, 0.71, 'May', 3, 3);

insert into experiments (hypothesis, detail, period, status, result, learning, next_action) values
('リピート勤務2回以上で面談化率が上がる', '勤務後24時間以内に社員コメント付きの面談案内を送る。', '[2026-04-01,2026-04-30]', '成功', '面談化率 18% -> 27%', '現場社員からの具体フィードバックが効く。', '社員コメントテンプレートを業界別に作成'),
('介護・物流は職場体験後の志望度変化が大きい', '体験前後アンケートで志望度差分を業界別に比較。', '[2026-04-15,2026-05-15]', '検証中', '物流 +26pt、介護 +33pt、外食 +21pt', 'ネガティブ先入観が強い業界ほど体験価値が出やすい。', '導入優先業界を物流・介護・ホテルに寄せる');
