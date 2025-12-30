export const resources = {
    en: {
        translation: {
            common: {
                add: 'Add',
                cancel: 'Cancel',
                delete: 'Delete',
                save: 'Save',
                yes: 'Yes',
                no: 'No',
                select: 'Select',
                actions: 'Actions',
            },
            app: {
                title: 'Smart Scheduler',
                staffManagement: 'Staff Management',
                ruleConfig: 'Rule Configuration',
                schedule: 'Schedule',
                footer: 'Smart Staff Scheduling © {{year}}',
            },
            staff: {
                title: 'Staff Management',
                addStaff: 'Add Staff',
                name: 'Name',
                roles: 'Roles',
                skills: 'Skills',
                permits: 'Permit Dates',
                confirmDelete: 'Are you sure you want to delete this staff member?',
                placeholders: {
                    name: 'e.g. Dr. John Doe',
                    roles: 'Select roles',
                    skills: 'Select or type skills',
                },
                rolesList: {
                    Doctor: 'Doctor',
                    Nurse: 'Nurse',
                    Technician: 'Technician',
                },
            },
            rules: {
                title: 'Rule Configuration',
                availability: {
                    title: 'Availability Check',
                    desc: 'Ensure staff are not assigned on their unavailable dates.',
                },
                noConsecutive: {
                    title: 'No Consecutive Shifts',
                    desc: 'Prevent staff from working two days in a row.',
                },
                skillMatch: {
                    title: 'Skill Matching',
                    desc: 'Ensure assigned staff have the required skill for the shift.',
                },
                weekendExclusion: {
                    title: 'Weekend Exclusion',
                    desc: 'Exclude specific staff members from weekend shifts.',
                    selectStaff: 'Select Staff to Exclude:',
                    alertExempt: '{{count}} staff members excluded',
                },
                shiftTypePreference: {
                    title: 'Shift Type Preference',
                    desc: 'Separate "Mesai" (Day only) staff from 24h/Night staff.',
                    selectMesai: 'Select "Mesai" (Day Shift Only) Staff:',
                    mesaiInfo: 'Selected staff will NEVER be assigned to Night/24h shifts.'
                },
                everyOtherDayLimit: {
                    title: 'Every Other Day Limit',
                    desc: 'Limit how many "Every Other Day" (Gün Aşırı) shifts a person can have per month.',
                    globalLimit: 'Global Limit (shifts/month):'
                },
                specificDatePermit: {
                    title: 'Specific Date Permits',
                    desc: 'Manage specific dates where staff are permitted (or restricted).',
                },
                scheduler: {
                    title: 'Schedule',
                    resultsTitle: 'Schedule Results',
                    generate: 'Generate Schedule',
                    optimumSuccess: 'Optimum Schedule Generated',
                    optimumDesc: 'Some quotas may have been relaxed to find a solution.',
                    shiftSummary: 'Staff Shift Summary',
                    timeoutOrStrict: 'Constraints too tight or Calculation Timed Out',
                    timeoutDesc: 'The schedule is very hard to generate with current rules. Would you like to generate the best possible schedule by relaxing quota limits?',
                    error: 'Error',
                    equalityConfig: {
                        title: 'Equal Distribution Constraint',
                        strict: 'Relax equality to satisfy other constraints',
                        preferred: 'Assign MORE shifts to:',
                        ignored: 'Assign LESS shifts to:',
                    },
                    failure: 'Failed to generate schedule',
                    calculating: 'Calculating...',
                    desc: 'Select a date range to generate the schedule automatically.',
                    success: 'Schedule generated successfully!'
                },
                savedSchedules: {
                    title: 'Saved Schedules',
                    saveTitle: 'Save Schedule',
                    saveDesc: 'Please enter a name for this schedule.',
                    namePlaceholder: 'e.g. January 2024',
                    confirmDelete: 'Are you sure you want to delete this saved schedule?',
                    load: 'View',
                    empty: 'No saved schedules yet.',
                    date: 'Date Created'
                },
                departments: {
                    title: 'Departments',
                    add: 'Add Department',
                    name: 'Department Name',
                    shifts: 'Shift Requirements',
                    addShift: 'Add Shift Type',
                    shiftType: 'Shift Type',
                    count: 'Count',
                    skills: 'Skills',
                    weekendToggle: 'Disable Day/Night Shifts on Weekends (24h only)',
                    confirmDelete: 'Delete this department?'
                },
                groupQuota: {
                    title: 'Group Quotas',
                    desc: 'Limit total shifts for a defined group of people.',
                    addGroup: 'Add Group',
                    groupName: 'Group Name',
                    maxShifts: 'Max Total Shifts',
                    selectFiles: 'Select Staff'
                }
            }
        }
    },
    tr: {
        translation: {
            common: {
                add: 'Ekle',
                cancel: 'İptal',
                delete: 'Sil',
                save: 'Kaydet',
                yes: 'Evet',
                no: 'Hayır',
                select: 'Seç',
                edit: 'Düzenle',
                exitEdit: 'Düzenlemeyi Bitir',
                actions: 'İşlemler',
                export: 'DIŞA AKTAR (Excel)',
                date: 'Tarih',
                success: 'İşlem Başarılı',
                deleted: 'Silindi'
            },
            app: {
                title: 'Akıllı Nöbet Sistemi',
                staffManagement: 'Personel Listesi',
                ruleConfig: 'Kısıtlamalar & Kurallar',
                schedule: 'Nöbet Oluştur',
                departments: 'Bölüm Tanımları',
                footer: 'Smart Staff Scheduling © {{year}}',
            },
            staff: {
                title: 'Personel Listesi ve Ayarlar',
                addStaff: 'Yeni Personel Ekle',
                editStaff: 'Personel Düzenle',
                selectProfile: 'Çalışma Listesi:',
                selectProfilePlaceholder: 'Liste Seçiniz...',
                newProfile: 'Yeni Liste Oluştur',
                deleteProfileConfirm: 'Bu listeyi tamamen silmek istediğinize emin misiniz?',
                name: 'Ad Soyad',
                roles: 'Unvan / Rol',
                skills: 'Yetkinlikler',
                permits: 'İzinli / Raporlu Günler',
                confirmDelete: 'Bu personeli silmek istediğinize emin misiniz?',
                placeholders: {
                    name: 'Örn: Dr. Ali Veli',
                    roles: 'Rol Seçiniz...',
                    skills: 'Yetenek Ekleyiniz...',
                },
                rolesList: {
                    Doctor: 'Doktor',
                    Nurse: 'Hemşire',
                    Technician: 'Teknisyen',
                },
            },
            rules: {
                title: 'Nöbet Kuralları ve Kısıtlamalar',
                availability: {
                    title: 'Müsaitlik Kontrolü',
                    desc: 'Personelin takviminde "Müsait Değil" işaretlediği günlere nöbet yazılmaz.',
                },
                noConsecutive: {
                    title: 'Peş Peşe Nöbet Yasağı',
                    desc: 'Bir personel nöbet tuttuktan sonraki gün tekrar nöbet tutamaz.',
                },
                skillMatch: {
                    title: 'Yetkinlik Eşleşmesi',
                    desc: 'Sadece ilgili bölümün yetkinliğine (Örn: MR, BT) sahip personeller o bölüme atanır.',
                },
                weekendExclusion: {
                    title: 'Haftasonu Muafiyeti',
                    desc: 'Seçilen personeller haftasonu (Cumartesi-Pazar) nöbetlerine yazılmaz.',
                    selectStaff: 'Muaf Personel Listesi:',
                    alertExempt: '{{count}} kişi muaf listesinde.',
                },
                specificDatePermit: {
                    title: 'Özel İzin Günleri',
                    desc: 'Personel kartında girilen izin aralıkları dikkate alınır.',
                },
                shiftTypePreference: {
                    title: 'Vardiya Tipi Tercihi',
                    desc: 'Mesai (08-17) çalışanları ile 24 saat nöbet tutanları ayırır.',
                    selectMesai: '"Sadece Gündüz" (Mesai) Çalışanları:',
                    mesaiInfo: 'Bu listedekiler gece veya 24 saatlik nöbetlere atanmaz.'
                },
                everyOtherDayLimit: {
                    title: 'Gün Aşırı Nöbet Sınırı',
                    desc: 'Personelin ay içerisinde çok sık (gün aşırı) nöbet tutmasını sınırlar.',
                    globalLimit: 'Aylık Maksimum Gün Aşırı Nöbet:'
                },
                groupQuota: {
                    title: 'Grup Kota Sınırı',
                    desc: 'Belirli bir personel grubuna yazılabilecek TOPLAM nöbet sayısının üst sınırını belirler (Hedef değildir, daha az da olabilir).',
                    addGroup: 'Yeni Grup Ekle',
                    groupName: 'Grup Adı',
                    maxShifts: 'En Fazla (Max) Nöbet',
                    selectFiles: 'Grup Üyeleri'
                }
            },
            scheduler: {
                title: 'Otomatik Nöbet Oluşturucu',
                resultsTitle: 'Oluşturulan Taslak Liste',
                generate: 'Listeyi Oluştur',
                errorNoDate: 'Lütfen başlangıç ve bitiş tarihi seçiniz.',
                success: 'Nöbet listesi başarıyla oluşturuldu.',
                failure: 'Liste oluşturulamadı! Kısıtlamaları gevşetmeyi deneyin.',
                failureDesc: 'Algoritma çözüm bulamadı.',
                calculating: 'Yapay Zeka Hesaplanıyor...',
                desc: 'Tarih aralığını seçip kısıtlamalara uygun en iyi listeyi oluşturun.',
                swapped: 'Nöbet Değiştirildi!',
                selectTarget: '{{name}} seçildi. Değiştirmek için diğer personele tıklayın.',
                optimumSuccess: 'Optimum Liste Oluşturuldu',
                optimumDesc: 'Çözüm bulmak için bazı kotalar esnetildi.',
                shiftSummary: 'Personel Nöbet/Mesai Özeti',
                timeoutOrStrict: 'Kısıtlamalar Çok Sıkı veya Zaman Aşımı',
                timeoutDesc: 'Mevcut kurallarla liste oluşturmak çok zor. Kota sınırlarını esneterek en iyi olası listeyi oluşturmak ister misiniz?',
                error: 'Hata',
                equalityConfig: {
                    title: 'Eşit Dağılım Kısıtı',
                    strict: 'Diğer kısıtları sağlamak için eşitliği boz',
                    preferred: 'Daha fazla nöbet tutacaklar',
                    ignored: 'Daha az nöbet tutacaklar',
                }
            },
            savedSchedules: {
                title: 'Kayıtlı Listeler',
                saveTitle: 'Listeyi Kaydet',
                saveDesc: 'Lütfen bu liste için bir isim giriniz.',
                namePlaceholder: 'Örn: Ocak 2024 Nöbet Listesi',
                confirmDelete: 'Bu kayıtlı listeyi silmek istediğinize emin misiniz?',
                load: 'Görüntüle',
                empty: 'Henüz kaydedilmiş bir liste yok.',
                date: 'Oluşturma Tarihi'
            },
            departments: {
                title: 'Bölüm ve Vardiya Yapılandırması',
                add: 'Bölüm Ekle',
                name: 'Bölüm Adı',
                staffCount: 'Gerekli Kişi',
                skills: 'Gerekli Yetkinlik',
                actions: 'Düzenle',
                shifts: 'Vardiya Türleri',
                addShift: 'Vardiya Tipi Ekle',
                shiftType: 'Tip',
                count: 'Kişi',
                weekendToggle: 'Haftasonu Gündüz Vardiyasını Kapat (Sadece 24h)',
                confirmDelete: 'Bölümü sil?'
            }
        }
    }
};
