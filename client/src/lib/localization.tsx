import {
  createContext,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";

export type Language = "en" | "ar";

const translations = new Map<string, string>([
  ["Loading…", "جارٍ التحميل…"],
  ["Relax.", "واسترخِ."],
  ["Built for independent cafés and restaurants.", "مصمم للمقاهي والمطاعم المستقلة."],
  ["Enter table number", "أدخل رقم الطاولة"],
  ["Brillo Cafe home", "الصفحة الرئيسية لبريلو كافيه"],
  ["View your orders", "عرض طلباتك"],
  ["Call a staff member", "طلب المساعدة"],
  ["Search the menu…", "ابحث في القائمة…"],
  ["Search the menu", "ابحث في القائمة"],
  ["Menu categories", "فئات القائمة"],
  ["Nothing matches that search", "لا توجد نتائج مطابقة"],
  ["Try a different word, or browse another category.", "جرّب كلمة أخرى أو تصفح فئة مختلفة."],
  ["Freshly prepared · Please tell us about any allergies.", "تُحضّر طازجة · يرجى إخبارنا بأي حساسية."],
  ["Your order", "طلبك"],
  ["Your cart is empty", "سلتك فارغة"],
  ["Add something from the menu and it will appear here.", "أضف شيئًا من القائمة وسيظهر هنا."],
  ["Decrease quantity", "تقليل الكمية"],
  ["Increase quantity", "زيادة الكمية"],
  ["Add a note for this item…", "أضف ملاحظة لهذا العنصر…"],
  ["For the order", "للطلب"],
  ["Allergies, timing…", "الحساسية، التوقيت…"],
  ["Subtotal", "المجموع الفرعي"],
  ["Tax", "الضريبة"],
  ["Service charge", "رسوم الخدمة"],
  ["Service", "الخدمة"],
  ["Total", "الإجمالي"],
  ["Orders are sent straight to the kitchen and your waiter.", "تُرسل الطلبات مباشرةً إلى المطبخ والنادل."],
  ["Sending…", "جارٍ الإرسال…"],
  ["Place order", "إرسال الطلب"],
  ["Currently unavailable", "غير متوفر حاليًا"],
  ["Received", "تم الاستلام"],
  ["Preparing", "قيد التحضير"],
  ["Ready", "جاهز"],
  ["Served", "تم التقديم"],
  ["Delivered", "تم التوصيل"],
  ["Cancelled", "ملغي"],
  ["Open", "مفتوح"],
  ["On it", "جارٍ التنفيذ"],
  ["Resolved", "تم الحل"],
  ["Close dialog", "إغلاق النافذة"],
  ["Confirm", "تأكيد"],
  ["Cancel", "إلغاء"],
  ["How can we help?", "كيف يمكننا مساعدتك؟"],
  ["Call a waiter", "استدعاء النادل"],
  ["Someone will come to your table.", "سيأتي أحد الموظفين إلى طاولتك."],
  ["Bring water", "إحضار الماء"],
  ["Still or sparkling — just ask.", "ماء عادي أو فوار — اطلب ما تفضله."],
  ["Clear the table", "تنظيف الطاولة"],
  ["We'll tidy up and take empty plates.", "سنرتب الطاولة ونرفع الأطباق الفارغة."],
  ["Something else", "طلب آخر"],
  ["Tell us what you need below.", "أخبرنا بما تحتاجه أدناه."],
  ["A staff member has been notified.", "تم إشعار أحد الموظفين."],
  ["They'll be with you shortly.", "سيصل إليك أحدهم قريبًا."],
  ["e.g. We need two extra glasses", "مثال: نحتاج إلى كأسين إضافيين"],
  ["Optional note", "ملاحظة اختيارية"],
  ["Tap a request above to send it. Notes are attached to the request.", "اضغط على أحد الطلبات أعلاه لإرساله. ستُرفق الملاحظات بالطلب."],
  ["Back to menu", "العودة إلى القائمة"],
  ["No orders yet", "لا توجد طلبات بعد"],
  ["Your table is ready. Browse the menu and send your first order whenever you like.", "طاولتك جاهزة. تصفح القائمة وأرسل طلبك الأول متى شئت."],
  ["Note: ", "ملاحظة: "],
  ["Request the bill?", "هل تريد طلب الفاتورة؟"],
  ["Request bill", "طلب الفاتورة"],
  ["Front of house", "خدمة الصالة"],
  ["Bills", "الفواتير"],
  ["Settle a table once payment is received. Bills are calculated from every unbilled order on the table.", "سجّل الفاتورة كمدفوعة بعد استلام المبلغ. تُحسب من جميع الطلبات غير المفوترة على الطاولة."],
  ["Bills are calculated from every unbilled order on the table.", "تُحسب الفواتير من جميع الطلبات غير المفوترة على الطاولة."],
  ["open", "مفتوحة"],
  ["all", "الكل"],
  ["You can view bills, but only an admin or floor manager can mark them as settled.", "يمكنك عرض الفواتير، لكن يمكن للمسؤول أو مدير الصالة فقط تسجيلها كمدفوعة."],
  ["Couldn't load bills", "تعذر تحميل الفواتير"],
  ["Check your connection and try again.", "تحقق من اتصالك وحاول مرة أخرى."],
  ["Try again", "إعادة المحاولة"],
  ["No open bills", "لا توجد فواتير مفتوحة"],
  ["No bills yet", "لا توجد فواتير بعد"],
  ["When a guest requests the bill from their table, it will appear here.", "ستظهر هنا الفاتورة عندما يطلبها أحد الضيوف من طاولته."],
  ["Settled and open bills will be listed here.", "ستظهر هنا الفواتير المدفوعة والمفتوحة."],
  ["Mark this bill as settled?", "هل تريد تسجيل هذه الفاتورة كمدفوعة؟"],
  ["Mark as paid", "تسجيل كمدفوعة"],
  ["Printable invoice", "فاتورة قابلة للطباعة"],
  ["Invoice", "فاتورة"],
  ["Table:", "الطاولة:"],
  ["Requested:", "تاريخ الطلب:"],
  ["Paid:", "تاريخ الدفع:"],
  ["Order", "الطلب"],
  ["Item", "الصنف"],
  ["Qty", "الكمية"],
  ["Unit price", "سعر الوحدة"],
  ["Status", "الحالة"],
  ["Amount", "المبلغ"],
  ["Print", "طباعة"],
  ["Settle bill", "تسديد الفاتورة"],
  ["Paid", "مدفوعة"],
  ["Guest care", "خدمة الضيوف"],
  ["Couldn't load service calls", "تعذر تحميل طلبات الخدمة"],
  ["No open service calls", "لا توجد طلبات خدمة مفتوحة"],
  ["When a guest asks for a waiter, water, or a table clean, it will land here instantly.", "ستظهر هنا فورًا طلبات الضيوف لاستدعاء نادل أو إحضار الماء أو تنظيف الطاولة."],
  ["Every waiter call, water request, and table clean appears here in real time. Acknowledge it so the rest of the team knows it's covered.", "تظهر هنا مباشرةً كل طلبات النادل والماء وتنظيف الطاولات. أكّد استلام الطلب ليعرف الفريق أنه قيد المتابعة."],
  ["Resolved calls are archived automatically and remain available in the database.", "تُؤرشف الطلبات المنجزة تلقائيًا وتبقى متاحة في قاعدة البيانات."],
  ["No additional note from the guest.", "لا توجد ملاحظات إضافية من الضيف."],
  ["I'm on it", "سأتولى ذلك"],
  ["Mark resolved", "تحديد كمكتمل"],
  ["Needs a waiter", "يحتاج إلى نادل"],
  ["Needs water", "يحتاج إلى ماء"],
  ["Table needs cleaning", "تحتاج الطاولة إلى تنظيف"],
  ["Needs assistance", "يحتاج إلى مساعدة"],
  ["The floor is calm", "الصالة هادئة"],
  ["New orders will appear here the moment a guest sends one. No refresh needed.", "ستظهر الطلبات الجديدة هنا فور إرسالها، دون الحاجة إلى تحديث الصفحة."],
  ["Couldn't load orders", "تعذر تحميل الطلبات"],
  ["QR codes", "رموز QR"],
  ["Couldn't load tables", "تعذر تحميل الطاولات"],
  ["No tables configured", "لم يتم إعداد أي طاولات"],
  ["Add table", "إضافة طاولة"],
  ["Add a table to generate its secure QR code.", "أضف طاولة لإنشاء رمز QR آمن لها."],
  ["A unique secure QR code will be created for this table.", "سيتم إنشاء رمز QR آمن وفريد لهذه الطاولة."],
  ["Table added.", "تمت إضافة الطاولة."],
  ["Delete table", "حذف الطاولة"],
  ["Delete table?", "هل تريد حذف الطاولة؟"],
  ["It will be removed from this list. Historical orders and bills are kept, and you can add this table number again later.", "ستُزال من هذه القائمة. ستُحفظ الطلبات والفواتير السابقة، ويمكنك إضافة رقم الطاولة مجددًا لاحقًا."],
  ["was deleted.", "تم حذفها."],
  ["Enter a table number from 1 to 100000.", "أدخل رقم طاولة من 1 إلى 100000."],
  ["A table with that number already exists.", "توجد طاولة بهذا الرقم بالفعل."],
  ["A table with active orders or an open bill cannot be deleted.", "لا يمكن حذف طاولة لديها طلبات نشطة أو فاتورة مفتوحة."],
  ["Print this code or share the secure link.", "اطبع هذا الرمز أو شارك الرابط الآمن."],
  ["Menu control", "إدارة القائمة"],
  ["Availability", "التوفر"],
  ["Flip an item off when it sells out. Changes apply to the guest menu immediately and orders are rejected server-side.", "أوقف العنصر عند نفاده. ستظهر التغييرات فورًا في قائمة الضيوف وسيُرفض طلب العنصر من الخادم."],
  ["Search menu items…", "ابحث عن عناصر القائمة…"],
  ["Search menu items", "ابحث عن عناصر القائمة"],
  ["available", "متاح"],
  ["Available", "متاح"],
  ["unavailable", "غير متاح"],
  ["Sold out", "نفد"],
  ["sold out", "نفد"],
  ["on", "متاح"],
  ["Toggle availability for", "تغيير التوفر لـ"],
  ["is now", "أصبح الآن"],
  ["No matching menu items", "لا توجد عناصر مطابقة"],
  ["Try a different search term.", "جرّب عبارة بحث مختلفة."],
  ["One live view.", "عرض مباشر واحد."],
  ["Live connection", "اتصال مباشر"],
  ["Reconnecting…", "جارٍ إعادة الاتصال…"],
  ["Live", "مباشر"],
  ["Offline", "غير متصل"],
  ["Administrator", "المسؤول"],
  ["Floor manager", "مدير الصالة"],
  ["Waiter", "النادل"],
  ["Live orders", "الطلبات المباشرة"],
  ["Service calls", "طلبات الخدمة"],
  ["Menu", "القائمة"],
  ["Tables & QR", "الطاولات ورموز QR"],
  ["Staff", "الموظفون"],
  ["Staff navigation", "تنقل الموظفين"],
  ["Admin navigation", "تنقل المسؤول"],
  ["Sign out", "تسجيل الخروج"],
  ["Table", "الطاولة"],
  ["Table number", "رقم الطاولة"],
  ["English", "English"],
  ["العربية", "العربية"],
  ["Order from your table", "اطلب من طاولتك"],
  ["A calmer way to order", "طريقة أسهل للطلب"],
  ["Scan. Sip.", "امسح الرمز. استمتع."],
  ["The menu is on your table. Order what you love, add a note, and let us take care of the rest.", "القائمة على طاولتك. اطلب ما تحب وأضف ملاحظة، ودع الباقي علينا."],
  ["Open menu", "فتح القائمة"],
  ["Usually you'll land here by scanning the QR code on your table.", "يمكنك الوصول إلى هنا بمسح رمز QR الموجود على طاولتك."],
  ["No account needed", "لا حاجة إلى حساب"],
  ["Live order updates", "تحديثات مباشرة للطلبات"],
  ["Pay at your table", "ادفع على طاولتك"],
  ["Window seat", "مقعد بجانب النافذة"],
  ["Try the demo table", "جرّب الطاولة التجريبية"],
  ["Scan your table", "امسح رمز طاولتك"],
  ["Every QR code is tied to the right table — no app, no account.", "يرتبط كل رمز QR بالطاولة الصحيحة — دون تطبيق أو حساب."],
  ["Order in seconds", "اطلب خلال ثوانٍ"],
  ["Browse the live menu, add notes, and send the order to the kitchen.", "تصفح القائمة المباشرة وأضف الملاحظات وأرسل طلبك إلى المطبخ."],
  ["Service on demand", "الخدمة عند الطلب"],
  ["Call a waiter, ask for water, or request the bill in one tap.", "استدعِ النادل أو اطلب الماء أو الفاتورة بلمسة واحدة."],
  ["Name (optional)", "الاسم (اختياري)"],
  ["Order note", "ملاحظة الطلب"],
  ["Browse the menu", "تصفح القائمة"],
  ["Clear cart", "إفراغ السلة"],
  ["A bill has already been requested for this table. Ask a staff member if you'd like to add more.", "تم طلب فاتورة هذه الطاولة بالفعل. اطلب من أحد الموظفين إضافة المزيد."],
  ["each", "للوحدة"],
  ["Special request", "طلب خاص"],
  ["This item is sold out right now. Please choose something else.", "هذا العنصر غير متوفر حاليًا. يرجى اختيار شيء آخر."],
  ["Add", "إضافة"],
  ["Add to cart", "أضف إلى السلة"],
  ["Popular", "الأكثر طلبًا"],
  ["Added to your order", "تمت إضافته إلى طلبك"],
  ["sent to the kitchen", "أُرسل إلى المطبخ"],
  ["Live updates", "تحديثات مباشرة"],
  ["Reconnecting", "جارٍ إعادة الاتصال"],
  ["Orders update live", "تتحدث الطلبات مباشرةً"],
  ["Trying to reconnect", "جارٍ محاولة إعادة الاتصال"],
  ["That table number doesn't look right.", "رقم الطاولة غير صحيح."],
  ["We couldn't load this table's menu.", "تعذر تحميل قائمة هذه الطاولة."],
  ["We couldn't load your table.", "تعذر تحميل بيانات طاولتك."],
  ["You can follow its progress on the next screen.", "يمكنك متابعة حالة طلبك في الشاشة التالية."],
  ["Bill requested", "تم طلب الفاتورة"],
  ["A staff member will bring it to your table.", "سيحضر أحد الموظفين الفاتورة إلى طاولتك."],
  ["What are we craving?", "ماذا نشتهي اليوم؟"],
  ["Everything is made fresh. Tap an item for details, or add it straight to your order.", "تُحضّر جميع الأطباق طازجة. اضغط على العنصر لمعرفة التفاصيل أو أضفه مباشرةً إلى طلبك."],
  ["All", "الكل"],
  ["Show the full menu", "عرض القائمة كاملة"],
  ["item", "عنصر"],
  ["items", "عناصر"],
  ["Bill requested ·", "تم طلب الفاتورة ·"],
  ["A staff member will bring the card machine. You can keep browsing while you wait.", "سيحضر أحد الموظفين جهاز الدفع. يمكنك مواصلة التصفح أثناء الانتظار."],
  ["Your service request is with the team.", "تم إرسال طلب الخدمة إلى فريقنا."],
  ["Need something? Call a staff member", "هل تحتاج إلى شيء؟ استدعِ أحد الموظفين"],
  ["A little suggestion", "اقتراح صغير"],
  ["Add to order", "أضف إلى الطلب"],
  ["Details", "التفاصيل"],
  ["We couldn't open this table", "تعذر فتح هذه الطاولة"],
  ["Back to start", "العودة إلى البداية"],
  ["Your table", "طاولتك"],
  ["Order status", "حالة الطلب"],
  ["Follow every plate from the kitchen to your table.", "تابع كل طبق من المطبخ حتى يصل إلى طاولتك."],
  ["Call staff", "استدعاء الموظفين"],
  ["Add items", "إضافة عناصر"],
  ["Your request is with the team", "طلبك لدى فريقنا"],
  ["Requested at", "تاريخ الطلب"],
  ["Waiting for payment", "بانتظار الدفع"],
  ["Ready to wrap up?", "هل أنت مستعد لإنهاء زيارتك؟"],
  ["Request the bill and we'll bring it to your table. You can keep ordering until then.", "اطلب الفاتورة وسنحضرها إلى طاولتك. يمكنك مواصلة الطلب حتى ذلك الحين."],
  ["Current total ·", "الإجمالي الحالي ·"],
  ["All orders on this table are settled.", "تمت تسوية جميع طلبات هذه الطاولة."],
  ["Need water", "أحتاج إلى ماء"],
  ["Clean table", "تنظيف الطاولة"],
  ["Need help?", "هل تحتاج إلى مساعدة؟"],
  ["We couldn't find your table", "تعذر العثور على طاولتك"],
  ["This page may have moved, or the QR code is no longer active. Ask a staff member for help.", "ربما تم نقل هذه الصفحة أو لم يعد رمز QR نشطًا. اطلب المساعدة من أحد الموظفين."],
  ["Table not found", "الطاولة غير موجودة"],
  ["Refresh", "تحديث"],
  ["Tables", "الطاولات"],
  ["Busy", "مشغولة"],
  ["Open bills", "الفواتير المفتوحة"],
  ["Bill", "الفاتورة"],
  ["View QR code", "عرض رمز QR"],
  ["Table QR", "رمز QR للطاولة"],
  ["QR code for table", "رمز QR للطاولة"],
  ["active order", "طلب نشط"],
  ["active orders", "طلبات نشطة"],
  ["new", "جديد"],
  ["Print each table's QR code and place it on the table. Every code opens the menu with the table number and secure key attached.", "اطبع رمز QR لكل طاولة وضعه عليها. يفتح كل رمز القائمة مع رقم الطاولة والمفتاح الآمن."],
  ["Scan to view the menu", "امسح الرمز لعرض القائمة"],
  ["Copy link", "نسخ الرابط"],
  ["Download", "تنزيل"],
  ["Open guest menu", "فتح قائمة الضيوف"],
  ["Could not generate the QR code.", "تعذر إنشاء رمز QR."],
  ["Table link copied.", "تم نسخ رابط الطاولة."],
  ["Could not copy the link.", "تعذر نسخ الرابط."],
  ["The floor, in sync", "الصالة في تناغم"],
  ["Every table.", "كل طاولة."],
  ["Every order.", "كل طلب."],
  ["Orders, service requests, and bills arrive in real time — so your team can spend less time checking screens and more time on the floor.", "تصل الطلبات وطلبات الخدمة والفواتير فورًا — ليقضي فريقك وقتًا أقل في متابعة الشاشات ووقتًا أكثر مع الضيوف."],
  ["orders", "الطلبات"],
  ["Instant", "فوري"],
  ["calls", "الطلبات"],
  ["Simple", "سهل"],
  ["billing", "الفوترة"],
  ["Guest", "الضيف"],
  ["Back to the guest menu", "العودة إلى قائمة الضيوف"],
  ["Staff sign in", "تسجيل دخول الموظفين"],
  ["Access the live floor dashboard. Accounts are created by the café administrator.", "ادخل إلى لوحة الصالة المباشرة. ينشئ مسؤول المقهى الحسابات."],
  ["Email address", "عنوان البريد الإلكتروني"],
  ["Password", "كلمة المرور"],
  ["Your password", "كلمة المرور"],
  ["Hide password", "إخفاء كلمة المرور"],
  ["Show password", "إظهار كلمة المرور"],
  ["Welcome back.", "مرحبًا بعودتك."],
  ["Admin", "المسؤول"],
  ["Manager", "مدير"],
  ["Signing in…", "جارٍ تسجيل الدخول…"],
  ["Sign in to dashboard", "تسجيل الدخول إلى لوحة التحكم"],
  ["Local demo accounts", "حسابات تجريبية محلية"],
  ["Protected by rate limiting and secure, HTTP-only session cookies.", "محمي بتحديد معدل الطلبات وملفات تعريف ارتباط جلسة آمنة عبر HTTP فقط."],
  ["Live floor", "الصالة المباشرة"],
  ["Good morning", "صباح الخير"],
  ["Good afternoon", "مساء الخير"],
  ["Good evening", "مساء الخير"],
  ["Updating live", "تحديث مباشر"],
  ["Active orders", "الطلبات النشطة"],
  ["Open calls", "الطلبات المفتوحة"],
  ["Tables busy", "الطاولات المشغولة"],
  ["Today's sales", "مبيعات اليوم"],
  ["Order board", "لوحة الطلبات"],
  ["Move each order through the kitchen and onto the table.", "تابع كل طلب من المطبخ حتى وصوله إلى الطاولة."],
  ["active", "نشط"],
  ["Waiting to be started", "بانتظار البدء"],
  ["In the kitchen", "في المطبخ"],
  ["Ready to serve", "جاهز للتقديم"],
  ["Start preparing", "بدء التحضير"],
  ["Mark ready", "تحديد كجاهز"],
  ["Mark delivered", "تحديد كتم التوصيل"],
  ["New", "جديد"],
  ["In progress", "قيد التنفيذ"],
  ["Request resolved.", "تم إنهاء الطلب."],
  ["Request acknowledged.", "تم تأكيد استلام الطلب."],
  ["Bill", "الفاتورة"],
  ["bill settled.", "تم تسديد الفاتورة."],
  ["Settled", "تم السداد"],
  ["Requested", "مطلوبة"],
  ["UNPAID", "غير مدفوعة"],
  ["PAID", "مدفوعة"],
  ["pending", "قيد الانتظار"],
  ["preparing", "قيد التحضير"],
  ["ready", "جاهز"],
  ["delivered", "تم التوصيل"],
  ["settled", "تم التسديد"],
  ["cancelled", "ملغاة"],
  ["No additional note from the guest.", "لا توجد ملاحظات إضافية من الضيف."],
  ["I'm on it", "سأتولى ذلك"],
  ["Mark resolved", "تحديد كمكتمل"],
  ["In progress", "قيد التنفيذ"],
  ["Table", "الطاولة"],
  ["order", "الطلب"],
  ["New order", "طلب جديد"],
  ["is requesting service", "يطلب الخدمة"],
  ["marked as paid.", "تم تسجيلها كمدفوعة."],
  ["Admin sign in", "تسجيل دخول المسؤول"],
  ["Access the admin dashboard. Accounts are created by the café owner.", "ادخل إلى لوحة تحكم المسؤول. ينشئ مالك المقهى الحسابات."],
  ["Sign in to admin", "تسجيل الدخول إلى لوحة المسؤول"],
  ["Local demo account", "حساب تجريبي محلي"],
  ["Menu management", "إدارة القائمة"],
  ["Financial overview", "نظرة مالية عامة"],
  ["Finance", "المالية"],
  ["Review delivered orders placed, recorded expenses, and menu item sales for a date range.", "راجع الطلبات المسلّمة التي أُنشئت والمصروفات المسجلة ومبيعات عناصر القائمة خلال فترة زمنية."],
  ["Add expense", "إضافة مصروف"],
  ["Update report", "تحديث التقرير"],
  ["From", "من"],
  ["To", "إلى"],
  ["Delivered sales", "المبيعات المسلّمة"],
  ["Before tax and service charges", "قبل الضرائب ورسوم الخدمة"],
  ["Expenses", "المصروفات"],
  ["recorded expenses", "مصروفات مسجلة"],
  ["Net profit / loss", "صافي الربح / الخسارة"],
  ["Delivered sales minus recorded expenses", "المبيعات المسلّمة ناقص المصروفات المسجلة"],
  ["Delivered orders", "الطلبات المسلّمة"],
  ["Best-selling items", "الأكثر مبيعًا"],
  ["Ranked by quantity sold in the selected period.", "مرتبة حسب الكمية المباعة في الفترة المحددة."],
  ["Least-selling items", "الأقل مبيعًا"],
  ["Includes current menu items with no sales.", "تشمل عناصر القائمة الحالية التي لم تُبع."],
  ["No delivered item sales in this date range.", "لا توجد مبيعات لعناصر مسلّمة في هذه الفترة."],
  ["No menu items to rank.", "لا توجد عناصر قائمة لترتيبها."],
  ["Expenses recorded within the selected date range.", "المصروفات المسجلة ضمن الفترة المحددة."],
  ["No expenses in this date range.", "لا توجد مصروفات في هذه الفترة."],
  ["Add an expense to include it in profit and loss.", "أضف مصروفًا لإدراجه في الأرباح والخسائر."],
  ["Delete expense", "حذف المصروف"],
  ["Delete expense?", "حذف المصروف؟"],
  ["Expense added.", "تمت إضافة المصروف."],
  ["Expense deleted.", "تم حذف المصروف."],
  ["Create a category for organizing menu items.", "أنشئ فئة لتنظيم عناصر القائمة."],
  ["Choose an expense date.", "اختر تاريخ المصروف."],
  ["Enter an expense description.", "أدخل وصف المصروف."],
  ["Enter a valid expense amount.", "أدخل مبلغًا صالحًا للمصروف."],
  ["Save expense", "حفظ المصروف"],
  ["Date", "التاريخ"],
  ["Amount", "المبلغ"],
  ["e.g. Coffee beans", "مثال: حبوب القهوة"],
  ["item sold", "عنصر مباع"],
  ["items sold", "عناصر مباعة"],
  ["Start date must be on or before end date.", "يجب أن يكون تاريخ البدء في أو قبل تاريخ الانتهاء."],
  ["Couldn't load financial report", "تعذر تحميل التقرير المالي"],
  ["Check your connection and try again.", "تحقق من اتصالك وحاول مرة أخرى."],
  ["Try again", "حاول مرة أخرى"],
  ["Couldn't load the menu", "تعذّر تحميل القائمة"],
  ["Add new items, update prices, or remove dishes. Changes appear on the guest menu immediately.", "أضف عناصر جديدة أو حدّث الأسعار أو احذف الأطباق. تظهر التغييرات فورًا في قائمة الضيوف."],
  ["Add item", "إضافة عنصر"],
  ["Add category", "إضافة فئة"],
  ["Create category", "إنشاء فئة"],
  ["Category name", "اسم الفئة"],
  ["Create a category for organizing menu items.", "أنشئ فئة لتنظيم عناصر القائمة."],
  ["Category added.", "تمت إضافة الفئة."],
  ["No categories yet", "لا توجد فئات بعد"],
  ["Create a category before adding menu items.", "أنشئ فئة قبل إضافة عناصر القائمة."],
  ["No items in this category yet.", "لا توجد عناصر في هذه الفئة بعد."],
  ["e.g. Seasonal specials", "مثال: عروض الموسم"],
  ["Edit menu item", "تعديل عنصر القائمة"],
  ["New menu item", "عنصر قائمة جديد"],
  ["Update the details or price shown to guests.", "حدّث التفاصيل أو السعر الظاهر للضيوف."],
  ["Add a dish or drink to the guest menu.", "أضف طبقًا أو مشروبًا إلى قائمة الضيوف."],
  ["Save changes", "حفظ التغييرات"],
  ["Delete item", "حذف العنصر"],
  ["Delete menu item?", "حذف عنصر القائمة؟"],
  ["This cannot be undone. Existing orders keep their recorded item details.", "لا يمكن التراجع عن هذا. تحتفظ الطلبات الحالية بتفاصيل العنصر المسجلة."],
  ["Name", "الاسم"],
  ["Category", "الفئة"],
  ["Description", "الوصف"],
  ["Menu item image", "صورة عنصر القائمة"],
  ["Choose a JPEG, PNG, or WebP image.", "اختر صورة بصيغة JPEG أو PNG أو WebP."],
  ["Images must be 5 MB or smaller.", "يجب ألا يتجاوز حجم الصورة 5 ميغابايت."],
  ["Choose a JPEG, PNG, or WebP image. Maximum size: 5 MB.", "اختر صورة بصيغة JPEG أو PNG أو WebP. الحد الأقصى للحجم 5 ميغابايت."],
  ["Price", "السعر"],
  ["Featured", "مميز"],
  ["Featured item", "عنصر مميز"],
  ["Highlight this item on the guest menu.", "أبرز هذا العنصر في قائمة الضيوف."],
  ["Available on the menu", "متاح في القائمة"],
  ["Guests can order this item now.", "يمكن للضيوف طلب هذا العنصر الآن."],
  ["No description yet.", "لا يوجد وصف بعد."],
  ["Choose a category", "اختر فئة"],
  ["e.g. Iced Vanilla Latte", "مثال: لاتيه فانيليا مثلج"],
  ["What makes this item special?", "ما الذي يميز هذا العنصر؟"],
  ["Give this item a name.", "أعطِ هذا العنصر اسمًا."],
  ["Choose a category.", "اختر فئة."],
  ["Enter a valid price.", "أدخل سعرًا صالحًا."],
  ["Menu item added.", "تمت إضافة عنصر القائمة."],
  ["Menu item updated.", "تم تحديث عنصر القائمة."],
  ["was deleted.", "تم حذفه."],
  ["Edit", "تعديل"],
  ["Delete", "حذف"],
]);

interface LocalizationValue {
  language: Language;
  setLanguage: (language: Language) => void;
  translate: (text: string) => string;
}

const LocalizationContext = createContext<LocalizationValue | null>(null);

function isLanguage(value: string | null): value is Language {
  return value === "en" || value === "ar";
}

export function LocalizationProvider({ children }: { children: ReactNode }) {
  const [language, setLanguageState] = useState<Language>(() => {
    const saved = window.localStorage.getItem("cafe-language");
    return isLanguage(saved) ? saved : "en";
  });

  const setLanguage = (nextLanguage: Language) => {
    window.localStorage.setItem("cafe-language", nextLanguage);
    setLanguageState(nextLanguage);
  };

  useEffect(() => {
    document.documentElement.lang = language;
    document.documentElement.dir = language === "ar" ? "rtl" : "ltr";
    document.title =
      language === "ar"
        ? "Brillo Cafe · اطلب من طاولتك"
        : "Brillo Cafe · Order from your table";
    const description = document.querySelector<HTMLMetaElement>(
      'meta[name="description"]'
    );
    if (description) {
      description.content =
        language === "ar"
          ? "امسح الرمز واطلب واستمتع. اطلب من Brillo Cafe مع خدمة مباشرة على الطاولة."
          : "Scan, order, and relax. Brillo Cafe ordering with live table service.";
    }
  }, [language]);

  const value = useMemo(
    () => ({
      language,
      setLanguage,
      translate: (text: string) => {
        if (language !== "ar") return text;
        const translation = translations.get(text);
        if (translation) return translation;
        const tableLabel = text.match(/^Table (\d+)(?: · (.+))?$/);
        if (tableLabel) {
          return tableLabel[2]
            ? `الطاولة ${tableLabel[1]} · ${tableLabel[2]}`
            : `الطاولة ${tableLabel[1]}`;
        }
        const removedItem = text.match(/^Remove (.+)$/);
        if (removedItem) return `إزالة ${removedItem[1]}`;
        const billRequest = text.match(
          /^Table (\d+) · pay at the table when you're ready\.$/
        );
        if (billRequest) {
          return `الطاولة ${billRequest[1]} · يمكنك الدفع على الطاولة عندما تكون مستعدًا.`;
        }
        const serviceRequest = text.match(
          /^Table (\d+) · requests appear instantly on the staff dashboard\.$/
        );
        if (serviceRequest) {
          return `الطاولة ${serviceRequest[1]} · تظهر الطلبات فورًا في لوحة الموظفين.`;
        }
        const billConfirmation = text.match(
          /^We'll bring the bill for (.+) to table (\d+)\. You won't be able to add new items after this\.$/
        );
        if (billConfirmation) {
          return `سنحضر فاتورة بقيمة ${billConfirmation[1]} إلى الطاولة ${billConfirmation[2]}. لن تتمكن من إضافة عناصر جديدة بعد ذلك.`;
        }
        const settleConfirmation = text.match(
          /^Confirm that (.+) has been paid for table (\d+)\. This cannot be undone\.$/
        );
        if (settleConfirmation) {
          return `تأكيد استلام مبلغ ${settleConfirmation[1]} للطاولة ${settleConfirmation[2]}. لا يمكن التراجع عن ذلك.`;
        }
        return text;
      },
    }),
    [language]
  );

  return (
    <LocalizationContext.Provider value={value}>
      {children}
    </LocalizationContext.Provider>
  );
}

export function useLocalization() {
  const context = useContext(LocalizationContext);
  if (!context) {
    throw new Error("useLocalization must be used within LocalizationProvider");
  }
  return context;
}

export function LanguageSwitcher() {
  const { language, setLanguage } = useLocalization();
  const nextLanguage = language === "en" ? "ar" : "en";

  return (
    <button
      type="button"
      className="language-switcher no-print"
      onClick={() => setLanguage(nextLanguage)}
      aria-label={language === "en" ? "العربية" : "English"}
    >
      {language === "en" ? "العربية" : "English"}
    </button>
  );
}
