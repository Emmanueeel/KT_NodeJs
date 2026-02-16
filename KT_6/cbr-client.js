const soap = require('soap');

const CBR_WSDL = 'http://www.cbr.ru/DailyInfoWebServ/DailyInfo.asmx?WSDL';

// Запасные данные на случай недоступности ЦБ
const MOCK_VALUTES = [
    { code: 'R01010', name: 'Австралийский доллар' },
    { code: 'R01015', name: 'Австрийский шиллинг' },
    { code: 'R01020A', name: 'Азербайджанский манат' },
    { code: 'R01035', name: 'Фунт стерлингов' },
    { code: 'R01040', name: 'Бельгийский франк' },
    { code: 'R01235', name: 'Доллар США' },
    { code: 'R01239', name: 'Евро' }
];

const MOCK_RATES = [
    { code: 'R01010', value: 56.78 },
    { code: 'R01015', value: 0.05 },
    { code: 'R01020A', value: 38.45 },
    { code: 'R01035', value: 98.23 },
    { code: 'R01040', value: 0.17 },
    { code: 'R01235', value: 89.45 },
    { code: 'R01239', value: 99.12 }
];

const MOCK_DYNAMICS = [
    { date: '01.02.2026', value: 88.50 },
    { date: '02.02.2026', value: 88.75 },
    { date: '03.02.2026', value: 89.00 },
    { date: '04.02.2026', value: 89.25 },
    { date: '05.02.2026', value: 89.50 },
    { date: '06.02.2026', value: 89.45 },
    { date: '07.02.2026', value: 89.60 }
];

/**
 * Получить справочник валют (EnumValutesXML)
 */
async function fetchValutesCatalog() {
    try {
        const client = await soap.createClientAsync(CBR_WSDL);
        const [result] = await client.EnumValutesXMLAsync({ Seld: false });
        
        const data = result.EnumValutesXMLResult;
        const valutes = [];
        
        if (data.ValuteData && data.ValuteData.EnumValutes) {
            const items = Array.isArray(data.ValuteData.EnumValutes) 
                ? data.ValuteData.EnumValutes 
                : [data.ValuteData.EnumValutes];
            
            items.forEach(item => {
                if (item.Vcode && item.Vname) {
                    valutes.push({
                        code: item.Vcode,
                        name: item.Vname
                    });
                }
            });
        }
        
        return valutes.length > 0 ? valutes : MOCK_VALUTES;
    } catch (err) {
        console.log('⚠️ ЦБ РФ недоступен, используем тестовые данные');
        return MOCK_VALUTES;
    }
}

/**
 * Получить курсы на дату (GetCursOnDateXML)
 */
async function fetchRatesOnDate(date) {
    try {
        const client = await soap.createClientAsync(CBR_WSDL);
        const [result] = await client.GetCursOnDateXMLAsync({ On_date: date });
        
        const data = result.GetCursOnDateXMLResult;
        const rates = [];
        
        if (data.ValuteData && data.ValuteData.ValuteCursOnDate) {
            let items = data.ValuteData.ValuteCursOnDate;
            items = Array.isArray(items) ? items : [items];
            
            items.forEach(item => {
                if (item.Vcode && item.Vcurs) {
                    rates.push({
                        code: item.Vcode,
                        value: parseFloat(item.Vcurs.replace(',', '.'))
                    });
                }
            });
        }
        
        return rates.length > 0 ? rates : MOCK_RATES;
    } catch (err) {
        console.log('⚠️ ЦБ РФ недоступен, используем тестовые данные');
        return MOCK_RATES;
    }
}

/**
 * Получить динамику курса (GetCursDynamicXML)
 */
async function fetchCurrencyDynamic(fromDate, toDate, valutaCode) {
    try {
        const client = await soap.createClientAsync(CBR_WSDL);
        const [result] = await client.GetCursDynamicXMLAsync({
            FromDate: fromDate,
            ToDate: toDate,
            ValutaCode: valutaCode
        });
        
        const data = result.GetCursDynamicXMLResult;
        const dynamics = [];
        
        if (data.ValuteData && data.ValuteData.ValuteCursDynamic) {
            let items = data.ValuteData.ValuteCursDynamic;
            items = Array.isArray(items) ? items : [items];
            
            items.forEach(item => {
                if (item.CursDate && item.Vcurs) {
                    const date = new Date(item.CursDate);
                    dynamics.push({
                        date: date.toLocaleDateString('ru-RU'),
                        value: parseFloat(item.Vcurs.replace(',', '.'))
                    });
                }
            });
        }
        
        return dynamics.length > 0 ? dynamics : MOCK_DYNAMICS;
    } catch (err) {
        console.log('⚠️ ЦБ РФ недоступен, используем тестовые данные');
        return MOCK_DYNAMICS;
    }
}

module.exports = {
    fetchValutesCatalog,
    fetchRatesOnDate,
    fetchCurrencyDynamic
};