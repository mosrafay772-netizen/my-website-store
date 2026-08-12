# KARNAK V13 — Online Backend

## تشغيل الأونلاين
1. أنشئ Project على Supabase.
2. افتح SQL Editor وشغّل `backend/schema.sql`.
3. أنشئ مستخدم إدارة من Authentication > Users.
4. ضع Project URL و anon/publishable key في `config.js` واجعل `remoteEnabled: true`.
5. شغّل الموقع عبر Web Server (VS Code Live Server مثلًا) ثم انشره على Vercel/Netlify.

## مهم
- لا تضع `service_role` key في الواجهة.
- السيارات والتعديلات والتحليلات وطلبات التجربة وسجل التغييرات والصور أصبحت مصممة للعمل أونلاين عند تفعيل Supabase.
- مشاركة العربية تستخدم Web Share على الموبايل وتنسخ الرابط على الأجهزة التي لا تدعم المشاركة.
- الأسعار والمواصفات في بيانات البداية تشغيلية ويجب اعتمادها رسميًا قبل النشر التجاري.
