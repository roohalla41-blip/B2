import React, { createContext, useContext, useState, useEffect } from 'react';
import { turkish } from './translations/turkish';
import { uzbek } from './translations/uzbek';

const translations = {
  farsi: {
    _dir: 'rtl', _name: 'فارسی', _flag: '🇮🇷',
    common: {
      save: 'ذخیره', cancel: 'انصراف', delete: 'حذف', edit: 'ویرایش', add: 'افزودن',
      close: 'بستن', confirm: 'تأیید', search: 'جستجو', status: 'وضعیت', active: 'فعال',
      inactive: 'غیرفعال', name: 'نام', mobile: 'شماره موبایل', description: 'توضیحات',
      amount: 'مبلغ', currency: 'ارز', date: 'تاریخ', type: 'نوع', total: 'مجموع',
      balance: 'موجودی', actions: 'عملیات', loading: 'در حال بارگذاری...', no_data: 'داده‌ای موجود نیست',
      yes: 'بله', no: 'خیر', all: 'همه', from: 'از', to: 'به', code: 'کد', phone: 'شماره',
      country: 'کشور', origin: 'مبدا', agency: 'نمایندگی', note: 'یادداشت', created_date: 'تاریخ ایجاد',
      registered_by: 'ثبت‌کننده', optional: 'اختیاری', view: 'مشاهده', back: 'بازگشت', submit: 'ارسال',
      enter: 'ورود', select: 'انتخاب', none: 'هیچ‌کدام', logout: 'خروج', welcome: 'خوش آمدید',
      home: 'خانه', confirm_delete: 'آیا از حذف مطمئن هستید؟', information: 'اطلاعات',
    },
    auth: {
      login_title: 'حساب صراف', login_subtitle: 'سامانه مدیریت هوشمند صرافی',
      mobile: 'شماره موبایل', email: 'ایمیل', password: 'رمز عبور', login: 'ورود',
      quick_login: 'ورود سریع آزمایشی', login_as_admin: 'ورود به عنوان سازنده',
      login_as_exchange: 'ورود به عنوان صراف', login_as_customer: 'ورود به عنوان مشتری',
      forgot_password: 'فراموشی رمز', select_country: 'انتخاب کشور', reset_password: 'بازیابی رمز',
      new_password: 'رمز جدید', confirm_password: 'تأیید رمز', send_reset: 'بازیابی رمز',
      reset_success: 'رمز شما با موفقیت تغییر کرد. اکنون می‌توانید وارد شوید.',
      invalid_credentials: 'شماره/ایمیل یا رمز اشتباه است.', back_to_login: 'بازگشت به ورود',
      login_method: 'روش ورود', login_with_mobile: 'ورود با موبایل', login_with_email: 'ورود با ایمیل',
      mobile_placeholder: '09100000000', email_placeholder: 'example@email.com',
      user_inactive: 'حساب شما غیرفعال است.', no_account: 'حسابی با این شماره یافت نشد.',
    },
    menu: {
      treasury: 'صندوق', customers: 'مشتریان', rates: 'نرخ‌رسانی', conversion: 'تبدیل ارز',
      transfers: 'حواله', ledger: 'دفتر کل', journal: 'روزنامه', bank: 'بانک', reports: 'گزارش‌ها',
      profit_loss: 'سود و زیان', employees: 'کارکنان', settings: 'تنظیمات', support: 'پشتیبانی',
      search: 'جستجو', language: 'زبان', mobile_recharge: 'شارژ موبایل', data_sync: 'دیتا / هماهنگ‌سازی', flows: 'گردش‌ها',
    },
    treasury: {
      title: 'صندوق صرافی', current_balance: 'موجودی فعلی', add_currency: 'افزودن ارز',
      deposit: 'افزایش موجودی', withdraw: 'کاهش موجودی', transaction_history: 'گردش صندوق',
      currency_name: 'نام ارز', confirm_deposit: 'تأیید افزایش', confirm_withdraw: 'تأیید کاهش',
      enter_amount: 'مبلغ را وارد کنید', enter_currency: 'نام ارز (مثل USD)', no_balance: 'موجودی ثبت نشده است',
    },
    customers: {
      title: 'مدیریت مشتریان', add_customer: 'ثبت مشتری جدید', edit_customer: 'ویرایش مشتری',
      code: 'کد مشتری', account_details: 'مشخصات حساب', balance: 'موجودی',
      transactions: 'تراکنش‌ها', register_new: 'ثبت مشتری', search_placeholder: 'جستجوی مشتری...',
      edit_info: 'اصلاح اطلاعات', save_changes: 'ذخیره تغییرات', customer_info: 'اطلاعات مشتری',
      no_customers: 'هنوز مشتری ثبت نشده است',
    },
    rates: {
      title: 'نرخ‌رسانی ارز', add_rate: 'ثبت نرخ جدید', currency: 'ارز', buy_rate: 'نرخ خرید',
      sell_rate: 'نرخ فروش', visibility: 'نمایش', public: 'عمومی', private: 'خصوصی',
      contact_info: 'اطلاعات تماس', show_contact: 'نمایش شماره تماس', display_name: 'نام نمایشی',
      no_rates: 'نرخی ثبت نشده است',
    },
    conversion: {
      title: 'تبدیل ارز', customer: 'مشتری', from_currency: 'ارز مبدا', from_amount: 'مبلغ مبدا',
      rate: 'نرخ', to_currency: 'ارز مقصد', to_amount: 'مبلغ مقصد', confirm_conversion: 'تأیید تبدیل',
      history: 'تاریخچه تبدیل‌ها', select_customer: 'انتخاب مشتری', enter_rate: 'نرخ تبدیل',
      calculated_amount: 'مبلغ محاسبه شده', confirm_title: 'تأیید عملیات تبدیل',
      confirm_message: 'آیا از ثبت این تبدیل ارز مطمئن هستید؟', conversion_done: 'تبدیل با موفقیت ثبت شد',
      no_customers: 'ابتدا مشتری ثبت کنید',
    },
    transfers: {
      title: 'ثبت حواله', sender: 'فرستنده', sender_name: 'نام فرستنده', sender_phone: 'شماره فرستنده',
      sender_country: 'کشور فرستنده', receiver: 'گیرنده', receiver_name: 'نام گیرنده',
      receiver_phone: 'شماره گیرنده', receiver_country: 'کشور گیرنده', account_owner: 'صاحب حساب',
      amount: 'مبلغ حواله', currency: 'ارز', origin: 'مبدا', agency: 'نمایندگی',
      transfer_number: 'شماره حواله', auto_generate: 'خودکار', manual: 'دستی',
      add_origin: 'افزودن مبدا/نمایندگی', select_origin: 'انتخاب مبدا', select_agency: 'انتخاب نمایندگی',
      no_owner: 'بدون صاحب حساب', history: 'تاریخچه حواله‌ها', sender_info: 'اطلاعات فرستنده',
      receiver_info: 'اطلاعات گیرنده', confirm_transfer: 'تأیید حواله', transfer_done: 'حواله ثبت شد',
      manage_origins: 'مدیریت مبدا و نمایندگی', origin_name: 'نام مبدا یا نمایندگی',
      enter_transfer_number: 'شماره حواله را وارد کنید',
    },
    bank: {
      title: 'بانک', bank_name: 'نام بانک', account_number: 'شماره حساب', currency: 'ارز',
      balance: 'موجودی', deposit: 'افزایش موجودی', withdraw: 'کاهش موجودی', transactions: 'گردش حساب',
      add_account: 'افزودن حساب بانکی', confirm_deposit: 'تأیید افزایش', confirm_withdraw: 'تأیید کاهش',
      no_accounts: 'حساب بانکی ثبت نشده است', account_movement: 'گردش حساب',
      enter_bank_name: 'نام بانک', enter_account_number: 'شماره حساب',
    },
    reports: {
      title: 'گزارش‌ها', treasury_balance: 'موجودی صندوق', transaction_volume: 'حجم تراکنش‌ها',
      customer_activity: 'فعالیت مشتریان', summary: 'خلاصه', currency_breakdown: 'تفکیک ارزی',
      inflow: 'ورودی', outflow: 'خروجی', net: 'خالص', by_currency: 'بر اساس ارز', overview: 'نمای کلی',
    },
    profit_loss: {
      title: 'سود و زیان', inflow: 'ورودی', outflow: 'خروجی', net_profit: 'سود/زیان خالص',
      current_balance: 'موجودی فعلی', by_currency: 'تفکیک ارزی', total: 'جمع کل',
    },
    employees: {
      title: 'کارکنان', add_employee: 'افزودن کارمند', employee_name: 'نام کارمند',
      show_profit_loss: 'نمایش سود و زیان برای کارمند', enabled: 'فعال', disabled: 'غیرفعال',
      registered_by: 'ثبت‌کننده', no_employees: 'کارمندی ثبت نشده است',
      toggle_setting: 'تنظیمات نمایش',
    },
    settings: {
      title: 'تنظیمات', language: 'زبان برنامه', exchange_info: 'اطلاعات صرافی',
      exchange_code: 'کد صرافی', exchange_name: 'نام صرافی', select_language: 'انتخاب زبان',
      account_info: 'اطلاعات حساب',
    },
    support: {
      title: 'پشتیبانی', contact_us: 'تماس با ما', subject: 'موضوع', message: 'پیام',
      send: 'ارسال', phone: 'تلفن', email: 'ایمیل', hours: 'ساعات کاری', version: 'نسخه',
      sent_success: 'پیام شما ارسال شد',
    },
    admin: {
      title: 'پنل سازنده', users: 'کاربران', create_exchange: 'ایجاد صراف جدید',
      exchange_name: 'نام صرافی', country: 'کشور', exchange_code: 'کد صرافی', create: 'ایجاد',
      role: 'نقش', user_list: 'لیست کاربران', exchange_list: 'صرافی‌ها', test_report: 'گزارش تست',
      activate: 'فعال‌سازی', deactivate: 'غیرفعال‌سازی', connection_requests: 'درخواست‌های اتصال',
      online_requests: 'درخواست‌های آنلاین', create_exchange_form: 'فرم ایجاد صراف',
      exchange_created: 'صراف با موفقیت ایجاد شد', country_select: 'انتخاب کشور',
    },
    search: {
      title: 'جستجوی کل برنامه', placeholder: 'جستجوی نام، کد، شماره، حواله...', categories: 'دسته‌بندی‌ها',
      results: 'نتایج جستجو', customers: 'مشتریان', transfers: 'حواله‌ها', transactions: 'تراکنش‌ها',
      treasury: 'صندوق', bank: 'بانک', no_results: 'نتیجه‌ای یافت نشد', codes: 'کدها',
      search_all: 'جستجوی همه',
    },
    recharge: {
      title: 'شارژ و خدمات', mobile_recharge: 'شارژ موبایل', internet_package: 'بسته اینترنت',
      ussd: 'یوسی موبایل', pubg_diamonds: 'الماس پابجی', under_development: 'در حال توسعه',
      coming_soon: 'به زودی',
    },
    language: { dari: 'دری', farsi: 'فارسی', pashto: 'پشتو', english: 'انگلیسی', arabic: 'عربی', select: 'انتخاب زبان' },
    welcome: {
      title: 'حساب صراف',
      subtitle: 'سامانه جامع مدیریت صرافی، تبدیل ارز و حسابداری مالی',
      secure_badge: 'محیط امن مالی',
      login: 'ورود به حساب',
      register_sarraaf: 'ثبت‌نام صراف',
      register_customer: 'ثبت‌نام مشتری',
      copyright: '© 2026 حساب صراف — تمامی حقوق محفوظ است',
    },
    contact: {
      title: 'لینک‌های ارتباطی',
      not_set: 'لینک تنظیم نشده',
      not_set_desc: 'این لینک هنوز توسط مدیر سیستم تنظیم نشده است',
      whatsapp: 'واتساپ', telegram: 'تلگرام', email: 'ایمیل', phone: 'تلفن',
      website: 'وب‌سایت', instagram: 'اینستاگرام', facebook: 'فیسبوک',
    },
  },

  dari: {
    _dir: 'rtl', _name: 'دری', _flag: '🇦🇫',
    common: {
      save: 'ذخیره', cancel: 'لغو', delete: 'حذف', edit: 'ویرایش', add: 'افزودن',
      close: 'بستن', confirm: 'تایید', search: 'جستجو', status: 'وضعیت', active: 'فعال',
      inactive: 'غیرفعال', name: 'نام', mobile: 'شماره موبایل', description: 'توضیحات',
      amount: 'مبلغ', currency: 'ارز', date: 'تاریخ', type: 'نوع', total: 'مجموع',
      balance: 'موجودی', actions: 'عملیات', loading: 'در حال بارگذاری...', no_data: 'داده‌ای موجود نیست',
      yes: 'بلی', no: 'نه', all: 'همه', from: 'از', to: 'به', code: 'کد', phone: 'شماره',
      country: 'کشور', origin: 'مبدا', agency: 'نمایندگی', note: 'یادداشت', created_date: 'تاریخ ایجاد',
      registered_by: 'ثبت‌کننده', optional: 'اختیاری', view: 'مشاهده', back: 'برگشت', submit: 'ارسال',
      enter: 'ورود', select: 'انتخاب', none: 'هیچ‌کدام', logout: 'خروج', welcome: 'خوش آمدید',
      home: 'خانه', confirm_delete: 'آیا از حذف مطمئن هستید؟', information: 'معلومات',
    },
    auth: {
      login_title: 'حساب صراف', login_subtitle: 'سیستم مدیریت هوشمند صرافی',
      mobile: 'شماره موبایل', email: 'ایمیل', password: 'رمز عبور', login: 'ورود',
      quick_login: 'ورود سریع آزمایشی', login_as_admin: 'ورود به عنوان سازنده',
      login_as_exchange: 'ورود به عنوان صراف', login_as_customer: 'ورود به عنوان مشتری',
      forgot_password: 'فراموشی رمز', select_country: 'انتخاب کشور', reset_password: 'بازیابی رمز',
      new_password: 'رمز جدید', confirm_password: 'تایید رمز', send_reset: 'بازیابی رمز',
      reset_success: 'رمز شما با موفقیت تغییر کرد. اکنون می‌توانید وارد شوید.',
      invalid_credentials: 'شماره/ایمیل یا رمز اشتباه است.', back_to_login: 'برگشت به ورود',
      login_method: 'روش ورود', login_with_mobile: 'ورود با موبایل', login_with_email: 'ورود با ایمیل',
      mobile_placeholder: '09100000000', email_placeholder: 'example@email.com',
      user_inactive: 'حساب شما غیرفعال است.', no_account: 'حسابی با این شماره یافت نشد.',
    },
    menu: {
      treasury: 'صندوق', customers: 'مشتریان', rates: 'نرخ‌گذاری', conversion: 'تبدیل ارز',
      transfers: 'حواله', ledger: 'دفتر کل', journal: 'روزنامه', bank: 'بانک', reports: 'گزارش‌ها',
      profit_loss: 'سود و زیان', employees: 'کارمندان', settings: 'تنظیمات', support: 'پشتیبانی',
      search: 'جستجو', language: 'زبان', mobile_recharge: 'شارژ موبایل',
    },
    treasury: {
      title: 'صندوق صرافی', current_balance: 'موجودی فعلی', add_currency: 'افزودن ارز',
      deposit: 'افزایش موجودی', withdraw: 'کاهش موجودی', transaction_history: 'گردش صندوق',
      currency_name: 'نام ارز', confirm_deposit: 'تایید افزایش', confirm_withdraw: 'تایید کاهش',
      enter_amount: 'مبلغ را وارد کنید', enter_currency: 'نام ارز (مثل USD)', no_balance: 'موجودی ثبت نشده است',
    },
    customers: {
      title: 'مدیریت مشتریان', add_customer: 'ثبت مشتری جدید', edit_customer: 'ویرایش مشتری',
      code: 'کد مشتری', account_details: 'مشخصات حساب', balance: 'موجودی',
      transactions: 'تراکنش‌ها', register_new: 'ثبت مشتری', search_placeholder: 'جستجوی مشتری...',
      edit_info: 'اصلاح اطلاعات', save_changes: 'ذخیره تغییرات', customer_info: 'معلومات مشتری',
      no_customers: 'هنوز مشتری ثبت نشده است',
    },
    rates: {
      title: 'نرخ‌گذاری ارز', add_rate: 'ثبت نرخ جدید', currency: 'ارز', buy_rate: 'نرخ خرید',
      sell_rate: 'نرخ فروش', visibility: 'نمایش', public: 'عمومی', private: 'خصوصی',
      contact_info: 'معلومات تماس', show_contact: 'نمایش شماره تماس', display_name: 'نام نمایشی',
      no_rates: 'نرخی ثبت نشده است',
    },
    conversion: {
      title: 'تبدیل ارز', customer: 'مشتری', from_currency: 'ارز مبدا', from_amount: 'مبلغ مبدا',
      rate: 'نرخ', to_currency: 'ارز مقصد', to_amount: 'مبلغ مقصد', confirm_conversion: 'تایید تبدیل',
      history: 'تاریخچه تبدیل‌ها', select_customer: 'انتخاب مشتری', enter_rate: 'نرخ تبدیل',
      calculated_amount: 'مبلغ محاسبه شده', confirm_title: 'تایید عملیات تبدیل',
      confirm_message: 'آیا از ثبت این تبدیل ارز مطمئن هستید؟', conversion_done: 'تبدیل با موفقیت ثبت شد',
      no_customers: 'ابتدا مشتری ثبت کنید',
    },
    transfers: {
      title: 'ثبت حواله', sender: 'فرستنده', sender_name: 'نام فرستنده', sender_phone: 'شماره فرستنده',
      sender_country: 'کشور فرستنده', receiver: 'گیرنده', receiver_name: 'نام گیرنده',
      receiver_phone: 'شماره گیرنده', receiver_country: 'کشور گیرنده', account_owner: 'صاحب حساب',
      amount: 'مبلغ حواله', currency: 'ارز', origin: 'مبدا', agency: 'نمایندگی',
      transfer_number: 'شماره حواله', auto_generate: 'خودکار', manual: 'دستی',
      add_origin: 'افزودن مبدا/نمایندگی', select_origin: 'انتخاب مبدا', select_agency: 'انتخاب نمایندگی',
      no_owner: 'بدون صاحب حساب', history: 'تاریخچه حواله‌ها', sender_info: 'معلومات فرستنده',
      receiver_info: 'معلومات گیرنده', confirm_transfer: 'تایید حواله', transfer_done: 'حواله ثبت شد',
      manage_origins: 'مدیریت مبدا و نمایندگی', origin_name: 'نام مبدا یا نمایندگی',
      enter_transfer_number: 'شماره حواله را وارد کنید',
    },
    bank: {
      title: 'بانک', bank_name: 'نام بانک', account_number: 'شماره حساب', currency: 'ارز',
      balance: 'موجودی', deposit: 'افزایش موجودی', withdraw: 'کاهش موجودی', transactions: 'گردش حساب',
      add_account: 'افزودن حساب بانکی', confirm_deposit: 'تایید افزایش', confirm_withdraw: 'تایید کاهش',
      no_accounts: 'حساب بانکی ثبت نشده است', account_movement: 'گردش حساب',
      enter_bank_name: 'نام بانک', enter_account_number: 'شماره حساب',
    },
    reports: {
      title: 'گزارش‌ها', treasury_balance: 'موجودی صندوق', transaction_volume: 'حجم تراکنش‌ها',
      customer_activity: 'فعالیت مشتریان', summary: 'خلاصه', currency_breakdown: 'تفکیک ارزی',
      inflow: 'ورودی', outflow: 'خروجی', net: 'خالص', by_currency: 'بر اساس ارز', overview: 'نمای کلی',
    },
    profit_loss: {
      title: 'سود و زیان', inflow: 'ورودی', outflow: 'خروجی', net_profit: 'سود/زیان خالص',
      current_balance: 'موجودی فعلی', by_currency: 'تفکیک ارزی', total: 'جمع کل',
    },
    employees: {
      title: 'کارمندان', add_employee: 'افزودن کارمند', employee_name: 'نام کارمند',
      show_profit_loss: 'نمایش سود و زیان برای کارمند', enabled: 'فعال', disabled: 'غیرفعال',
      registered_by: 'ثبت‌کننده', no_employees: 'کارمندی ثبت نشده است', toggle_setting: 'تنظیمات نمایش',
    },
    settings: {
      title: 'تنظیمات', language: 'زبان برنامه', exchange_info: 'معلومات صرافی',
      exchange_code: 'کد صرافی', exchange_name: 'نام صرافی', select_language: 'انتخاب زبان',
      account_info: 'معلومات حساب',
    },
    support: {
      title: 'پشتیبانی', contact_us: 'تماس با ما', subject: 'موضوع', message: 'پیام',
      send: 'ارسال', phone: 'تلفن', email: 'ایمیل', hours: 'ساعات کاری', version: 'نسخه',
      sent_success: 'پیام شما ارسال شد',
    },
    admin: {
      title: 'پنل سازنده', users: 'کاربران', create_exchange: 'ایجاد صراف جدید',
      exchange_name: 'نام صرافی', country: 'کشور', exchange_code: 'کد صرافی', create: 'ایجاد',
      role: 'نقش', user_list: 'لیست کاربران', exchange_list: 'صرافی‌ها', test_report: 'گزارش تست',
      activate: 'فعال‌سازی', deactivate: 'غیرفعال‌سازی', connection_requests: 'درخواست‌های اتصال',
      online_requests: 'درخواست‌های آنلاین', create_exchange_form: 'فرم ایجاد صراف',
      exchange_created: 'صراف با موفقیت ایجاد شد', country_select: 'انتخاب کشور',
    },
    search: {
      title: 'جستجوی کل برنامه', placeholder: 'جستجوی نام، کد، شماره، حواله...', categories: 'دسته‌بندی‌ها',
      results: 'نتایج جستجو', customers: 'مشتریان', transfers: 'حواله‌ها', transactions: 'تراکنش‌ها',
      treasury: 'صندوق', bank: 'بانک', no_results: 'نتیجه‌ای یافت نشد', codes: 'کدها', search_all: 'جستجوی همه',
    },
    recharge: {
      title: 'شارژ و خدمات', mobile_recharge: 'شارژ موبایل', internet_package: 'بسته اینترنت',
      ussd: 'یوسی موبایل', pubg_diamonds: 'الماس پابجی', under_development: 'در حال توسعه', coming_soon: 'به زودی',
    },
    language: { dari: 'دری', farsi: 'فارسی', pashto: 'پشتو', english: 'انگلیسی', arabic: 'عربی', select: 'انتخاب زبان' },
    welcome: {
      title: 'حساب صراف',
      subtitle: 'د صرافۍ جامع مدیریت سیسټم، د اسعارو تبادله او مالي حسابداري',
      secure_badge: 'امن مالي چاپیریال',
      login: 'د حساب ننوتل',
      register_sarraaf: 'د صراف راجستر',
      register_customer: 'د پیرودونکي راجستر',
      copyright: '© 2026 حساب صراف — ټول حقوق خوندي دي',
    },
    contact: {
      title: 'د اړیکې لینکونه',
      not_set: 'لینک نه دی تنظیم شوی',
      not_set_desc: 'دا لینک لا تر اوسه د سیسټم مدیر لخوا تنظیم شوی نه دی',
      whatsapp: 'واتساپ', telegram: 'تلګرام', email: 'بریښنالیک', phone: 'تلیفون',
      website: 'ویب‌سایټ', instagram: 'انستاګرام', facebook: 'فیسبوک',
    },
  },

  pashto: {
    _dir: 'rtl', _name: 'پښتو', _flag: '🇦🇫',
    common: {
      save: 'خوندي کول', cancel: 'لغوه', delete: 'حذف', edit: 'سمون', add: 'زیاتول',
      close: 'تړل', confirm: 'تایید', search: 'لټون', status: 'حالت', active: 'فعال',
      inactive: 'غیرفعال', name: 'نوم', mobile: 'د موبایل شمیره', description: 'تشریح',
      amount: 'مبلغ', currency: 'اسعار', date: 'نیټه', type: 'ډول', total: 'ټول',
      balance: 'موجودیت', actions: 'عملیات', loading: 'د بارولو په حال کې...', no_data: 'د معلوماتو نشتوالی',
      yes: 'هو', no: 'نه', all: 'ټول', from: 'له', to: 'ته', code: 'کوډ', phone: 'شمیره',
      country: 'هیواد', origin: 'مبدأ', agency: 'استازیتوب', note: 'یادښت', created_date: 'د جوړیدو نیټه',
      registered_by: 'ثبت کوونکی', optional: 'اختیاري', view: 'لیدنه', back: 'وروسته', submit: 'سپارل',
      enter: 'ننوتل', select: 'ټاکنه', none: 'هیڅ', logout: 'وتل', welcome: 'ښه راغلاست',
      home: 'کور', confirm_delete: 'ایا له حذف ډاډه یاست؟', information: 'معلومات',
    },
    auth: {
      login_title: 'د صراف حساب', login_subtitle: 'د صرافۍ هوښیار مدیریت سیسټم',
      mobile: 'د موبایل شمیره', email: 'بریښنالیک', password: 'پاسورډ', login: 'ننوتل',
      quick_login: 'سریع آزمایشي ننوتل', login_as_admin: 'د جوړونکي په توګه ننوتل',
      login_as_exchange: 'د صراف په توګه ننوتل', login_as_customer: 'د پیرودونکي په توګه ننوتل',
      forgot_password: 'د پاسورډ هیرول', select_country: 'د هیواد ټاکنه', reset_password: 'د پاسورډ بیا رغونه',
      new_password: 'نوی پاسورډ', confirm_password: 'د پاسورډ تایید', send_reset: 'د پاسورډ بیا رغونه',
      reset_success: 'ستاسو پاسورډ په بریالیتوب سره بدل شو. اوس کولی شئ ننوځئ.',
      invalid_credentials: 'شمیره/بریښنالیک یا پاسورډ غلط دی.', back_to_login: 'بیرته ننوتل ته',
      login_method: 'د ننوتل طریقه', login_with_mobile: 'د موبایل له لارې ننوتل', login_with_email: 'د بریښنالیک له لارې ننوتل',
      mobile_placeholder: '09100000000', email_placeholder: 'example@email.com',
      user_inactive: 'ستاسو حساب غیرفعال دی.', no_account: 'د دې شمیرې سره حساب و نه موندل شو.',
    },
    menu: {
      treasury: 'صندوق', customers: 'پیرودونکي', rates: 'د نرخ ټاکل', conversion: 'د اسعارو تبادله',
      transfers: 'حواله', ledger: 'عمومی دفتر', journal: 'ورځنیه', bank: 'بانک', reports: 'گزارشونه',
      profit_loss: 'ګټه او زیان', employees: 'کارمندان', settings: 'تنظیمات', support: 'ملاتړ',
      search: 'لټون', language: 'ژبه', mobile_recharge: 'د موبایل چارج', data_sync: 'ډاټا / همغږي', flows: 'بهیرنې',
    },
    treasury: {
      title: 'د صرافۍ صندوق', current_balance: 'اوسنی موجودیت', add_currency: 'د اسعارو زیاتول',
      deposit: 'د موجودیت زیاتول', withdraw: 'د موجودیت کمول', transaction_history: 'د صندوق گردش',
      currency_name: 'د اسعارو نوم', confirm_deposit: 'د زیاتولو تایید', confirm_withdraw: 'د کمولو تایید',
      enter_amount: 'مبلغ دننه کړئ', enter_currency: 'د اسعارو نوم (لکه USD)', no_balance: 'موجودیت ثبت شوی نه دی',
    },
    customers: {
      title: 'د پیرودونکو مدیریت', add_customer: 'نوی پیرودونکی ثبتول', edit_customer: 'د پیرودونکي سمون',
      code: 'د پیرودونکي کوډ', account_details: 'د حساب مشخصات', balance: 'موجودیت',
      transactions: 'تراکنشونه', register_new: 'د پیرودونکي ثبت', search_placeholder: 'د پیرودونکي لټون...',
      edit_info: 'د معلوماتو سمون', save_changes: 'د بدلونونو خوندي کول', customer_info: 'د پیرودونکي معلومات',
      no_customers: 'تر اوسه پورې پیرودونکی ثبت شوی نه دی',
    },
    rates: {
      title: 'د اسعارو نرخ ټاکل', add_rate: 'د نوي نرخ ثبت', currency: 'اسعار', buy_rate: 'د خرید نرخ',
      sell_rate: 'د خرڅلاو نرخ', visibility: 'ښودنه', public: 'عامه', private: 'خصوصي',
      contact_info: 'د اړیکې معلومات', show_contact: 'د تماس شمیره ښودل', display_name: 'د ښودنې نوم',
      no_rates: 'نرخ ثبت شوی نه دی',
    },
    conversion: {
      title: 'د اسعارو تبادله', customer: 'پیرودونکی', from_currency: 'د مبدا اسعار', from_amount: 'د مبدا مبلغ',
      rate: 'نرخ', to_currency: 'د مقصد اسعار', to_amount: 'د مقصد مبلغ', confirm_conversion: 'د تبادلې تایید',
      history: 'د تبادلو تاریخچه', select_customer: 'د پیرودونکي ټاکنه', enter_rate: 'د تبادلې نرخ',
      calculated_amount: 'محاسبه شوی مبلغ', confirm_title: 'د تبادلې عملیې تایید',
      confirm_message: 'ایا له دې اسعارو تبادلې ډاډه یاست؟', conversion_done: 'تبادله په بریالیتوب سره ثبت شوه',
      no_customers: 'لومړی پیرودونکی ثبت کړئ',
    },
    transfers: {
      title: 'د حوالې ثبت', sender: 'لیږونکی', sender_name: 'د لیږونکي نوم', sender_phone: 'د لیږونکي شمیره',
      sender_country: 'د لیږونکي هیواد', receiver: 'ترلاسه کوونکی', receiver_name: 'د ترلاسه کوونکي نوم',
      receiver_phone: 'د ترلاسه کوونکي شمیره', receiver_country: 'د ترلاسه کوونکي هیواد', account_owner: 'د حساب څښتن',
      amount: 'د حوالې مبلغ', currency: 'اسعار', origin: 'مبدأ', agency: 'استازیتوب',
      transfer_number: 'د حوالې شمیره', auto_generate: 'خودکار', manual: 'لاسي',
      add_origin: 'د مبدأ/استازیتوب زیاتول', select_origin: 'د مبدأ ټاکنه', select_agency: 'د استازیتوب ټاکنه',
      no_owner: 'د حساب څښتن پرته', history: 'د حوالو تاریخچه', sender_info: 'د لیږونکي معلومات',
      receiver_info: 'د ترلاسه کوونکي معلومات', confirm_transfer: 'د حوالې تایید', transfer_done: 'حواله ثبت شوه',
      manage_origins: 'د مبدأ او استازیتوب مدیریت', origin_name: 'د مبدأ یا استازیتوب نوم',
      enter_transfer_number: 'د حوالې شمیره دننه کړئ',
    },
    bank: {
      title: 'بانک', bank_name: 'د بانک نوم', account_number: 'د حساب شمیره', currency: 'اسعار',
      balance: 'موجودیت', deposit: 'د موجودیت زیاتول', withdraw: 'د موجودیت کمول', transactions: 'د حساب گردش',
      add_account: 'د بانک حساب زیاتول', confirm_deposit: 'د زیاتولو تایید', confirm_withdraw: 'د کمولو تایید',
      no_accounts: 'د بانک حساب ثبت شوی نه دی', account_movement: 'د حساب گردش',
      enter_bank_name: 'د بانک نوم', enter_account_number: 'د حساب شمیره',
    },
    reports: {
      title: 'گزارشونه', treasury_balance: 'د صندوق موجودیت', transaction_volume: 'د تراکنشونو حجم',
      customer_activity: 'د پیرودونکو فعالیت', summary: 'لنډیز', currency_breakdown: 'د اسعارو تفکیک',
      inflow: 'ورودی', outflow: 'وتلی', net: 'خالص', by_currency: 'په اسعارو', overview: 'عمومی کتنه',
    },
    profit_loss: {
      title: 'ګټه او زیان', inflow: 'ورودی', outflow: 'وتلی', net_profit: 'خالص ګټه/زیان',
      current_balance: 'اوسنی موجودیت', by_currency: 'د اسعارو تفکیک', total: 'ټول جمع',
    },
    employees: {
      title: 'کارمندان', add_employee: 'کارمند زیاتول', employee_name: 'د کارمند نوم',
      show_profit_loss: 'د کارمند لپاره د ګټې او زیان ښودنه', enabled: 'فعال', disabled: 'غیرفعال',
      registered_by: 'ثبت کوونکی', no_employees: 'کارمند ثبت شوی نه دی', toggle_setting: 'د ښودنې تنظیمات',
    },
    settings: {
      title: 'تنظیمات', language: 'د برنامه ژبه', exchange_info: 'د صرافۍ معلومات',
      exchange_code: 'د صرافۍ کوډ', exchange_name: 'د صرافۍ نوم', select_language: 'د ژبې ټاکنه',
      account_info: 'د حساب معلومات',
    },
    support: {
      title: 'ملاتړ', contact_us: 'له موږ سره اړیکه', subject: 'موضوع', message: 'پیغام',
      send: 'سپارل', phone: 'تلیفون', email: 'بریښنالیک', hours: 'د کار ساعتونه', version: 'نسخه',
      sent_success: 'ستاسو پیغام ولېږل شو',
    },
    admin: {
      title: 'د جوړونکي پینل', users: 'کاروونکي', create_exchange: 'نوی صراف جوړول',
      exchange_name: 'د صرافۍ نوم', country: 'هیواد', exchange_code: 'د صرافۍ کوډ', create: 'جوړول',
      role: 'رول', user_list: 'د کاروونکو لیست', exchange_list: 'صرافیان', test_report: 'د تست گزارش',
      activate: 'فعالول', deactivate: 'غیرفعالول', connection_requests: 'د اتصال غوښتنې',
      online_requests: 'آنلاین غوښتنې', create_exchange_form: 'د صراف جوړول فورمه',
      exchange_created: 'صراف په بریالیتوب سره جوړ شو', country_select: 'د هیواد ټاکنه',
    },
    search: {
      title: 'د ټولې برنامه لټون', placeholder: 'د نوم، کوډ، شمیرې، حوالې لټون...', categories: 'کټګورۍ',
      results: 'د لټون پایلې', customers: 'پیرودونکي', transfers: 'حوالې', transactions: 'تراکنشونه',
      treasury: 'صندوق', bank: 'بانک', no_results: 'پایله ونه موندل شوه', codes: 'کوډونه', search_all: 'د ټولو لټون',
    },
    recharge: {
      title: 'چارج او خدمات', mobile_recharge: 'د موبایل چارج', internet_package: 'د انټرنیټ بسته',
      ussd: 'یوسی موبایل', pubg_diamonds: 'د پابجي الماس', under_development: 'د پرمختګ په حال کې', coming_soon: 'ډیر ژر',
    },
    language: { dari: 'دری', farsi: 'فارسی', pashto: 'پښتو', english: 'انګلیسي', arabic: 'عربي', select: 'د ژبې ټاکنه' },
    welcome: {
      title: 'د صراف حساب',
      subtitle: 'د صرافۍ هوښیار مدیریت سیسټم، د اسعارو تبادله او مالي حسابداري',
      secure_badge: 'امن مالي چاپیریال',
      login: 'د حساب ننوتل',
      register_sarraaf: 'د صراف راجستر',
      register_customer: 'د پیرودونکي راجستر',
      copyright: '© 2026 د صراف حساب — ټول حقوق خوندي دي',
    },
    contact: {
      title: 'د اړیکې لینکونه',
      not_set: 'لینک نه دی تنظیم شوی',
      not_set_desc: 'دا لینک لا تر اوسه د سیسټم مدیر لخوا تنظیم شوی نه دی',
      whatsapp: 'واتساپ', telegram: 'تلګرام', email: 'بریښنالیک', phone: 'تلیفون',
      website: 'ویب‌سایټ', instagram: 'انستاګرام', facebook: 'فیسبوک',
    },
  },

  english: {
    _dir: 'ltr', _name: 'English', _flag: '🇬🇧',
    common: {
      save: 'Save', cancel: 'Cancel', delete: 'Delete', edit: 'Edit', add: 'Add',
      close: 'Close', confirm: 'Confirm', search: 'Search', status: 'Status', active: 'Active',
      inactive: 'Inactive', name: 'Name', mobile: 'Mobile Number', description: 'Description',
      amount: 'Amount', currency: 'Currency', date: 'Date', type: 'Type', total: 'Total',
      balance: 'Balance', actions: 'Actions', loading: 'Loading...', no_data: 'No data available',
      yes: 'Yes', no: 'No', all: 'All', from: 'From', to: 'To', code: 'Code', phone: 'Phone',
      country: 'Country', origin: 'Origin', agency: 'Agency', note: 'Note', created_date: 'Created Date',
      registered_by: 'Registered By', optional: 'Optional', view: 'View', back: 'Back', submit: 'Submit',
      enter: 'Enter', select: 'Select', none: 'None', logout: 'Logout', welcome: 'Welcome',
      home: 'Home', confirm_delete: 'Are you sure you want to delete?', information: 'Information',
    },
    auth: {
      login_title: 'Hesab Sarraf', login_subtitle: 'Smart Exchange Management System',
      mobile: 'Mobile Number', email: 'Email', password: 'Password', login: 'Login',
      quick_login: 'Quick Demo Login', login_as_admin: 'Login as Admin',
      login_as_exchange: 'Login as Exchange', login_as_customer: 'Login as Customer',
      forgot_password: 'Forgot Password', select_country: 'Select Country', reset_password: 'Reset Password',
      new_password: 'New Password', confirm_password: 'Confirm Password', send_reset: 'Reset Password',
      reset_success: 'Your password has been changed successfully. You can now login.',
      invalid_credentials: 'Mobile/Email or password is incorrect.', back_to_login: 'Back to Login',
      login_method: 'Login Method', login_with_mobile: 'Login with Mobile', login_with_email: 'Login with Email',
      mobile_placeholder: '09100000000', email_placeholder: 'example@email.com',
      user_inactive: 'Your account is inactive.', no_account: 'No account found with this number.',
    },
    menu: {
      treasury: 'Treasury', customers: 'Customers', rates: 'Rates', conversion: 'Currency Conversion',
      transfers: 'Transfers', ledger: 'Ledger', journal: 'Journal', bank: 'Bank', reports: 'Reports',
      profit_loss: 'Profit & Loss', employees: 'Employees', settings: 'Settings', support: 'Support',
      search: 'Search', language: 'Language', mobile_recharge: 'Mobile Recharge', data_sync: 'Data / Sync', flows: 'Flows',
    },
    treasury: {
      title: 'Exchange Treasury', current_balance: 'Current Balance', add_currency: 'Add Currency',
      deposit: 'Deposit', withdraw: 'Withdraw', transaction_history: 'Treasury Transactions',
      currency_name: 'Currency Name', confirm_deposit: 'Confirm Deposit', confirm_withdraw: 'Confirm Withdraw',
      enter_amount: 'Enter Amount', enter_currency: 'Currency Name (e.g. USD)', no_balance: 'No balance recorded',
    },
    customers: {
      title: 'Customer Management', add_customer: 'Add New Customer', edit_customer: 'Edit Customer',
      code: 'Customer Code', account_details: 'Account Details', balance: 'Balance',
      transactions: 'Transactions', register_new: 'Register Customer', search_placeholder: 'Search customer...',
      edit_info: 'Edit Information', save_changes: 'Save Changes', customer_info: 'Customer Info',
      no_customers: 'No customers registered yet',
    },
    rates: {
      title: 'Currency Rates', add_rate: 'Add New Rate', currency: 'Currency', buy_rate: 'Buy Rate',
      sell_rate: 'Sell Rate', visibility: 'Visibility', public: 'Public', private: 'Private',
      contact_info: 'Contact Info', show_contact: 'Show Contact Number', display_name: 'Display Name',
      no_rates: 'No rates registered',
    },
    conversion: {
      title: 'Currency Conversion', customer: 'Customer', from_currency: 'From Currency', from_amount: 'From Amount',
      rate: 'Rate', to_currency: 'To Currency', to_amount: 'To Amount', confirm_conversion: 'Confirm Conversion',
      history: 'Conversion History', select_customer: 'Select Customer', enter_rate: 'Conversion Rate',
      calculated_amount: 'Calculated Amount', confirm_title: 'Confirm Conversion',
      confirm_message: 'Are you sure you want to register this conversion?', conversion_done: 'Conversion registered successfully',
      no_customers: 'Register a customer first',
    },
    transfers: {
      title: 'Register Transfer', sender: 'Sender', sender_name: 'Sender Name', sender_phone: 'Sender Phone',
      sender_country: 'Sender Country', receiver: 'Receiver', receiver_name: 'Receiver Name',
      receiver_phone: 'Receiver Phone', receiver_country: 'Receiver Country', account_owner: 'Account Owner',
      amount: 'Transfer Amount', currency: 'Currency', origin: 'Origin', agency: 'Agency',
      transfer_number: 'Transfer Number', auto_generate: 'Auto', manual: 'Manual',
      add_origin: 'Add Origin/Agency', select_origin: 'Select Origin', select_agency: 'Select Agency',
      no_owner: 'No Account Owner', history: 'Transfer History', sender_info: 'Sender Info',
      receiver_info: 'Receiver Info', confirm_transfer: 'Confirm Transfer', transfer_done: 'Transfer registered',
      manage_origins: 'Manage Origins & Agencies', origin_name: 'Origin or Agency Name',
      enter_transfer_number: 'Enter transfer number',
    },
    bank: {
      title: 'Bank', bank_name: 'Bank Name', account_number: 'Account Number', currency: 'Currency',
      balance: 'Balance', deposit: 'Deposit', withdraw: 'Withdraw', transactions: 'Account Movement',
      add_account: 'Add Bank Account', confirm_deposit: 'Confirm Deposit', confirm_withdraw: 'Confirm Withdraw',
      no_accounts: 'No bank accounts registered', account_movement: 'Account Movement',
      enter_bank_name: 'Bank Name', enter_account_number: 'Account Number',
    },
    reports: {
      title: 'Reports', treasury_balance: 'Treasury Balance', transaction_volume: 'Transaction Volume',
      customer_activity: 'Customer Activity', summary: 'Summary', currency_breakdown: 'Currency Breakdown',
      inflow: 'Inflow', outflow: 'Outflow', net: 'Net', by_currency: 'By Currency', overview: 'Overview',
    },
    profit_loss: {
      title: 'Profit & Loss', inflow: 'Inflow', outflow: 'Outflow', net_profit: 'Net Profit/Loss',
      current_balance: 'Current Balance', by_currency: 'By Currency', total: 'Grand Total',
    },
    employees: {
      title: 'Employees', add_employee: 'Add Employee', employee_name: 'Employee Name',
      show_profit_loss: 'Show Profit & Loss to Employee', enabled: 'Enabled', disabled: 'Disabled',
      registered_by: 'Registered By', no_employees: 'No employees registered', toggle_setting: 'Display Settings',
    },
    settings: {
      title: 'Settings', language: 'App Language', exchange_info: 'Exchange Info',
      exchange_code: 'Exchange Code', exchange_name: 'Exchange Name', select_language: 'Select Language',
      account_info: 'Account Info',
    },
    support: {
      title: 'Support', contact_us: 'Contact Us', subject: 'Subject', message: 'Message',
      send: 'Send', phone: 'Phone', email: 'Email', hours: 'Working Hours', version: 'Version',
      sent_success: 'Your message has been sent',
    },
    admin: {
      title: 'Admin Panel', users: 'Users', create_exchange: 'Create New Exchange',
      exchange_name: 'Exchange Name', country: 'Country', exchange_code: 'Exchange Code', create: 'Create',
      role: 'Role', user_list: 'User List', exchange_list: 'Exchanges', test_report: 'Test Report',
      activate: 'Activate', deactivate: 'Deactivate', connection_requests: 'Connection Requests',
      online_requests: 'Online Requests', create_exchange_form: 'Create Exchange Form',
      exchange_created: 'Exchange created successfully', country_select: 'Select Country',
    },
    search: {
      title: 'Global Search', placeholder: 'Search name, code, number, transfer...', categories: 'Categories',
      results: 'Search Results', customers: 'Customers', transfers: 'Transfers', transactions: 'Transactions',
      treasury: 'Treasury', bank: 'Bank', no_results: 'No results found', codes: 'Codes', search_all: 'Search All',
    },
    recharge: {
      title: 'Recharge & Services', mobile_recharge: 'Mobile Recharge', internet_package: 'Internet Package',
      ussd: 'USSD Mobile', pubg_diamonds: 'PUBG Diamonds', under_development: 'Under Development', coming_soon: 'Coming Soon',
    },
    language: { dari: 'Dari', farsi: 'Farsi', pashto: 'Pashto', english: 'English', arabic: 'Arabic', select: 'Select Language' },
    welcome: {
      title: 'Hesab Sarraf',
      subtitle: 'Comprehensive exchange management, currency conversion and financial accounting',
      secure_badge: 'Secure Financial Environment',
      login: 'Login to Account',
      register_sarraaf: 'Register as Exchange',
      register_customer: 'Register as Customer',
      copyright: '© 2026 Hesab Sarraf — All rights reserved',
    },
    contact: {
      title: 'Contact Links',
      not_set: 'Link not set',
      not_set_desc: 'This link has not been configured by the system administrator yet',
      whatsapp: 'WhatsApp', telegram: 'Telegram', email: 'Email', phone: 'Phone',
      website: 'Website', instagram: 'Instagram', facebook: 'Facebook',
    },
  },

  arabic: {
    _dir: 'rtl', _name: 'العربية', _flag: '🇸🇦',
    common: {
      save: 'حفظ', cancel: 'إلغاء', delete: 'حذف', edit: 'تعديل', add: 'إضافة',
      close: 'إغلاق', confirm: 'تأكيد', search: 'بحث', status: 'الحالة', active: 'نشط',
      inactive: 'غير نشط', name: 'الاسم', mobile: 'رقم الهاتف', description: 'الوصف',
      amount: 'المبلغ', currency: 'العملة', date: 'التاريخ', type: 'النوع', total: 'المجموع',
      balance: 'الرصيد', actions: 'إجراءات', loading: 'جار التحميل...', no_data: 'لا توجد بيانات',
      yes: 'نعم', no: 'لا', all: 'الكل', from: 'من', to: 'إلى', code: 'رمز', phone: 'هاتف',
      country: 'الدولة', origin: 'المصدر', agency: 'الوكالة', note: 'ملاحظة', created_date: 'تاريخ الإنشاء',
      registered_by: 'مسجل بواسطة', optional: 'اختياري', view: 'عرض', back: 'رجوع', submit: 'إرسال',
      enter: 'دخول', select: 'تحديد', none: 'لا شيء', logout: 'خروج', welcome: 'مرحباً',
      home: 'الرئيسية', confirm_delete: 'هل أنت متأكد من الحذف؟', information: 'معلومات',
    },
    auth: {
      login_title: 'حساب الصراف', login_subtitle: 'نظام إدارة الصرافة الذكي',
      mobile: 'رقم الهاتف', email: 'البريد الإلكتروني', password: 'كلمة المرور', login: 'دخول',
      quick_login: 'دخول سريع تجريبي', login_as_admin: 'الدخول كمنشئ',
      login_as_exchange: 'الدخول كصراف', login_as_customer: 'الدخول كعميل',
      forgot_password: 'نسيت كلمة المرور', select_country: 'اختر الدولة', reset_password: 'إعادة تعيين كلمة المرور',
      new_password: 'كلمة مرور جديدة', confirm_password: 'تأكيد كلمة المرور', send_reset: 'إعادة تعيين كلمة المرور',
      reset_success: 'تم تغيير كلمة المرور بنجاح. يمكنك الآن الدخول.',
      invalid_credentials: 'رقم الهاتف/البريد أو كلمة المرور غير صحيحة.', back_to_login: 'العودة لتسجيل الدخول',
      login_method: 'طريقة الدخول', login_with_mobile: 'الدخول بالهاتف', login_with_email: 'الدخول بالبريد الإلكتروني',
      mobile_placeholder: '09100000000', email_placeholder: 'example@email.com',
      user_inactive: 'حسابك غير نشط.', no_account: 'لم يتم العثور على حساب بهذا الرقم.',
    },
    menu: {
      treasury: 'الصندوق', customers: 'العملاء', rates: 'أسعار الصرف', conversion: 'تحويل العملة',
      transfers: 'الحوالات', ledger: 'الدفتر العام', journal: 'اليومية', bank: 'البنك', reports: 'التقارير',
      profit_loss: 'الأرباح والخسائر', employees: 'الموظفون', settings: 'الإعدادات', support: 'الدعم',
      search: 'بحث', language: 'اللغة', mobile_recharge: 'شحن الهاتف', data_sync: 'البيانات / المزامنة', flows: 'التدفقات',
    },
    treasury: {
      title: 'صندوق الصرافة', current_balance: 'الرصيد الحالي', add_currency: 'إضافة عملة',
      deposit: 'إيداع', withdraw: 'سحب', transaction_history: 'حركات الصندوق',
      currency_name: 'اسم العملة', confirm_deposit: 'تأكيد الإيداع', confirm_withdraw: 'تأكيد السحب',
      enter_amount: 'أدخل المبلغ', enter_currency: 'اسم العملة (مثل USD)', no_balance: 'لم يتم تسجيل رصيد',
    },
    customers: {
      title: 'إدارة العملاء', add_customer: 'تسجيل عميل جديد', edit_customer: 'تعديل العميل',
      code: 'رمز العميل', account_details: 'تفاصيل الحساب', balance: 'الرصيد',
      transactions: 'المعاملات', register_new: 'تسجيل العميل', search_placeholder: 'بحث عن عميل...',
      edit_info: 'تعديل المعلومات', save_changes: 'حفظ التغييرات', customer_info: 'معلومات العميل',
      no_customers: 'لم يتم تسجيل عملاء بعد',
    },
    rates: {
      title: 'أسعار الصرف', add_rate: 'تسجيل سعر جديد', currency: 'العملة', buy_rate: 'سعر الشراء',
      sell_rate: 'سعر البيع', visibility: 'الظهور', public: 'عام', private: 'خاص',
      contact_info: 'معلومات الاتصال', show_contact: 'إظهار رقم الاتصال', display_name: 'اسم العرض',
      no_rates: 'لم يتم تسجيل أسعار',
    },
    conversion: {
      title: 'تحويل العملة', customer: 'العميل', from_currency: 'عملة المصدر', from_amount: 'مبلغ المصدر',
      rate: 'السعر', to_currency: 'عملة الوجهة', to_amount: 'مبلغ الوجهة', confirm_conversion: 'تأكيد التحويل',
      history: 'سجل التحويلات', select_customer: 'اختيار العميل', enter_rate: 'سعر التحويل',
      calculated_amount: 'المبلغ المحسوب', confirm_title: 'تأكيد عملية التحويل',
      confirm_message: 'هل أنت متأكد من تسجيل هذا التحويل؟', conversion_done: 'تم تسجيل التحويل بنجاح',
      no_customers: 'سجل عميلاً أولاً',
    },
    transfers: {
      title: 'تسجيل حوالة', sender: 'المرسل', sender_name: 'اسم المرسل', sender_phone: 'هاتف المرسل',
      sender_country: 'دولة المرسل', receiver: 'المستلم', receiver_name: 'اسم المستلم',
      receiver_phone: 'هاتف المستلم', receiver_country: 'دولة المستلم', account_owner: 'صاحب الحساب',
      amount: 'مبلغ الحوالة', currency: 'العملة', origin: 'المصدر', agency: 'الوكالة',
      transfer_number: 'رقم الحوالة', auto_generate: 'تلقائي', manual: 'يدوي',
      add_origin: 'إضافة مصدر/وكالة', select_origin: 'اختيار المصدر', select_agency: 'اختيار الوكالة',
      no_owner: 'بدون صاحب حساب', history: 'سجل الحوالات', sender_info: 'معلومات المرسل',
      receiver_info: 'معلومات المستلم', confirm_transfer: 'تأكيد الحوالة', transfer_done: 'تم تسجيل الحوالة',
      manage_origins: 'إدارة المصادر والوكالات', origin_name: 'اسم المصدر أو الوكالة',
      enter_transfer_number: 'أدخل رقم الحوالة',
    },
    bank: {
      title: 'البنك', bank_name: 'اسم البنك', account_number: 'رقم الحساب', currency: 'العملة',
      balance: 'الرصيد', deposit: 'إيداع', withdraw: 'سحب', transactions: 'حركة الحساب',
      add_account: 'إضافة حساب بنكي', confirm_deposit: 'تأكيد الإيداع', confirm_withdraw: 'تأكيد السحب',
      no_accounts: 'لم يتم تسجيل حسابات بنكية', account_movement: 'حركة الحساب',
      enter_bank_name: 'اسم البنك', enter_account_number: 'رقم الحساب',
    },
    reports: {
      title: 'التقارير', treasury_balance: 'رصيد الصندوق', transaction_volume: 'حجم المعاملات',
      customer_activity: 'نشاط العملاء', summary: 'ملخص', currency_breakdown: 'تفصيل العملات',
      inflow: 'داخل', outflow: 'خارج', net: 'صافي', by_currency: 'حسب العملة', overview: 'نظرة عامة',
    },
    profit_loss: {
      title: 'الأرباح والخسائر', inflow: 'داخل', outflow: 'خارج', net_profit: 'صافي الربح/الخسارة',
      current_balance: 'الرصيد الحالي', by_currency: 'حسب العملة', total: 'المجموع الكلي',
    },
    employees: {
      title: 'الموظفون', add_employee: 'إضافة موظف', employee_name: 'اسم الموظف',
      show_profit_loss: 'إظهار الأرباح والخسائر للموظف', enabled: 'مفعّل', disabled: 'غير مفعّل',
      registered_by: 'مسجل بواسطة', no_employees: 'لم يتم تسجيل موظفين', toggle_setting: 'إعدادات العرض',
    },
    settings: {
      title: 'الإعدادات', language: 'لغة البرنامج', exchange_info: 'معلومات الصرافة',
      exchange_code: 'رمز الصرافة', exchange_name: 'اسم الصرافة', select_language: 'اختيار اللغة',
      account_info: 'معلومات الحساب',
    },
    support: {
      title: 'الدعم', contact_us: 'اتصل بنا', subject: 'الموضوع', message: 'الرسالة',
      send: 'إرسال', phone: 'الهاتف', email: 'البريد الإلكتروني', hours: 'ساعات العمل', version: 'الإصدار',
      sent_success: 'تم إرسال رسالتك',
    },
    admin: {
      title: 'لوحة المنشئ', users: 'المستخدمون', create_exchange: 'إنشاء صراف جديد',
      exchange_name: 'اسم الصرافة', country: 'الدولة', exchange_code: 'رمز الصرافة', create: 'إنشاء',
      role: 'الدور', user_list: 'قائمة المستخدمين', exchange_list: 'الصرافات', test_report: 'تقرير الاختبار',
      activate: 'تفعيل', deactivate: 'إلغاء التفعيل', connection_requests: 'طلبات الاتصال',
      online_requests: 'الطلبات عبر الإنترنت', create_exchange_form: 'نموذج إنشاء صراف',
      exchange_created: 'تم إنشاء الصراف بنجاح', country_select: 'اختر الدولة',
    },
    search: {
      title: 'البحث الشامل', placeholder: 'البحث عن اسم، رمز، رقم، حوالة...', categories: 'الفئات',
      results: 'نتائج البحث', customers: 'العملاء', transfers: 'الحوالات', transactions: 'المعاملات',
      treasury: 'الصندوق', bank: 'البنك', no_results: 'لم يتم العثور على نتائج', codes: 'الرموز', search_all: 'البحث في الكل',
    },
    recharge: {
      title: 'الشحن والخدمات', mobile_recharge: 'شحن الهاتف', internet_package: 'باقة الإنترنت',
      ussd: 'USSD الهاتف', pubg_diamonds: 'جواهر ببجي', under_development: 'قيد التطوير', coming_soon: 'قريباً',
    },
    language: { dari: 'الدارية', farsi: 'الفارسية', pashto: 'الباشتونية', english: 'الإنجليزية', arabic: 'العربية', select: 'اختيار اللغة' },
    welcome: {
      title: 'حساب الصراف',
      subtitle: 'نظام شامل لإدارة الصرافة، تحويل العملات والمحاسبة المالية',
      secure_badge: 'بيئة مالية آمنة',
      login: 'دخول إلى الحساب',
      register_sarraaf: 'تسجيل الصراف',
      register_customer: 'تسجيل العميل',
      copyright: '© 2026 حساب الصراف — جميع الحقوق محفوظة',
    },
    contact: {
      title: 'روابط التواصل',
      not_set: 'الرابط غير مضبوط',
      not_set_desc: 'لم يتم ضبط هذا الرابط من قبل مسؤول النظام بعد',
      whatsapp: 'واتساب', telegram: 'تلغرام', email: 'البريد الإلكتروني', phone: 'الهاتف',
      website: 'الموقع الإلكتروني', instagram: 'إنستغرام', facebook: 'فيسبوك',
    },
  },

  turkish,

  uzbek,
};

const LanguageContext = createContext();

export function LanguageProvider({ children }) {
  const [lang, setLang] = useState(() => {
    try {
      // Try user-specific language first, then fall back to default
      const userId = localStorage.getItem('auth_user_id') || '';
      const userKey = userId ? `lang_${userId}` : null;
      if (userKey) {
        const userLang = localStorage.getItem(userKey);
        if (userLang) return userLang;
      }
      return localStorage.getItem('demo_language') || 'farsi';
    } catch {
      return 'farsi';
    }
  });

  useEffect(() => {
    try {
      // Save to both default and user-specific key
      localStorage.setItem('demo_language', lang);
      const userId = localStorage.getItem('auth_user_id') || '';
      if (userId) {
        localStorage.setItem(`lang_${userId}`, lang);
      }
      const dir = translations[lang]?._dir || 'rtl';
      document.documentElement.dir = dir;
      document.documentElement.lang = lang;
    } catch {
      // ignore
    }
  }, [lang]);

  const t = (key) => {
    const keys = key.split('.');
    let value = translations[lang];
    for (const k of keys) {
      value = value?.[k];
    }
    return value !== undefined ? value : key;
  };

  return (
    <LanguageContext.Provider value={{ lang, t, setLang, dir: translations[lang]?._dir || 'rtl' }}>
      {children}
    </LanguageContext.Provider>
  );
}

export function useLanguage() {
  const ctx = useContext(LanguageContext);
  if (!ctx) throw new Error('useLanguage must be used within LanguageProvider');
  return ctx;
}

export const LANGUAGES = [
  { code: 'farsi', name: 'فارسی', flag: '🇮🇷' },
  { code: 'dari', name: 'دری', flag: '🇦🇫' },
  { code: 'pashto', name: 'پښتو', flag: '🇦🇫' },
  { code: 'uzbek', name: 'O\'zbekcha', flag: '🇦🇫' },
  { code: 'english', name: 'English', flag: '🇬🇧' },
  { code: 'turkish', name: 'Türkçe', flag: '🇹🇷' },
  { code: 'arabic', name: 'العربية', flag: '🇸🇦' },
];

export const COUNTRIES = [
  { code: '+93', name: 'افغانستان', flag: '🇦🇫' },
  { code: '+98', name: 'ایران', flag: '🇮🇷' },
  { code: '+92', name: 'پاکستان', flag: '🇵🇰' },
  { code: '+971', name: 'امارات', flag: '🇦🇪' },
  { code: '+1', name: 'آمریکا', flag: '🇺🇸' },
  { code: '+49', name: 'آلمان', flag: '🇩🇪' },
  { code: '+44', name: 'انگلستان', flag: '🇬🇧' },
  { code: '+90', name: 'ترکیه', flag: '🇹🇷' },
  { code: '+966', name: 'عربستان', flag: '🇸🇦' },
];