
import dayjs, { Dayjs } from 'dayjs';

// Turkish Public Holidays
// Fixed Dates:
// 1 Jan - Yılbaşı
// 23 Apr - 23 Nisan
// 1 May - 1 Mayıs
// 19 May - 19 Mayıs
// 15 Jul - 15 Temmuz
// 30 Aug - 30 Ağustos
// 29 Oct - 29 Ekim

// Religious Holidays (Hardcoded for 2024-2027 for simplicity)
// Note: In a real production app, checking a dynamic API or library is better, 
// but for a standalone utility, a map is reliable.
const RELIGIOUS_HOLIDAYS: Record<string, string[]> = {
    '2024': [
        '2024-04-10', '2024-04-11', '2024-04-12', // Ramadan Feast (Ramazan Bayramı)
        '2024-06-16', '2024-06-17', '2024-06-18', '2024-06-19' // Sacrifice Feast (Kurban Bayramı)
    ],
    '2025': [
        '2025-03-30', '2025-03-31', '2025-04-01', // Ramadan Feast
        '2025-06-06', '2025-06-07', '2025-06-08', '2025-06-09' // Sacrifice Feast
    ],
    '2026': [
        '2026-03-20', '2026-03-21', '2026-03-22', // Ramadan Feast
        '2026-05-27', '2026-05-28', '2026-05-29', '2026-05-30' // Sacrifice Feast
    ],
    '2027': [
        '2027-03-09', '2027-03-10', '2027-03-11', // Ramadan Feast
        '2027-05-16', '2027-05-17', '2027-05-18', '2027-05-19' // Sacrifice Feast
    ]
};

export const isTurkishPublicHoliday = (date: Dayjs): { isHoliday: boolean; name?: string } => {
    const d = dayjs(date);
    const dateStr = d.format('MM-DD');
    const fullDateStr = d.format('YYYY-MM-DD');
    const year = d.year().toString();

    // 1. Check Fixed Holidays
    if (dateStr === '01-01') return { isHoliday: true, name: 'Yılbaşı' };
    if (dateStr === '04-23') return { isHoliday: true, name: '23 Nisan' };
    if (dateStr === '05-01') return { isHoliday: true, name: '1 Mayıs' };
    if (dateStr === '05-19') return { isHoliday: true, name: '19 Mayıs' };
    if (dateStr === '07-15') return { isHoliday: true, name: '15 Temmuz' };
    if (dateStr === '08-30') return { isHoliday: true, name: '30 Ağustos' };
    if (dateStr === '10-29') return { isHoliday: true, name: '29 Ekim' };

    // 2. Check Religious Holidays
    if (RELIGIOUS_HOLIDAYS[year] && RELIGIOUS_HOLIDAYS[year].includes(fullDateStr)) {
        return { isHoliday: true, name: 'Bayram Tatili' };
    }

    return { isHoliday: false };
};
