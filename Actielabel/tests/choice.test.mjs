import assert from 'node:assert/strict';import {readFile} from 'node:fs/promises';import {parseProductCashback,actionType,choiceGift} from '../worker/backend.js';
const base=await readFile(new URL('./fixtures/product-cashback.html',import.meta.url),'utf8');
const smeg=base.replaceAll('7914857','7762771').replaceAll('Oral-B','Smeg').replaceAll('Cashback Smeg','Pottenset of cashback cadeau').replaceAll('special-action-8005','special-action-8120').replaceAll('30,00','250,00');
assert.equal(actionType('Pottenset of cashback cadeau'),'choice');assert.equal(actionType('Cashback Oral-B'),'cashback');assert.equal(choiceGift('Pottenset of cashback cadeau'),'Pottenset cadeau');assert.equal(choiceGift('Bruiswatertoestel of cashback van 100 euro'),'Bruiswatertoestel cadeau');
const result=parseProductCashback(smeg,'7762771');assert.equal(result.amounts['8120'],250);assert.equal(result.choices['8120'].giftChoice,'Pottenset cadeau');
assert.equal(result.amounts['8005'],undefined,'Niet koppelen aan een andere actie');console.log('Keuzeactie: cashbackbedrag en cadeau gekoppeld aan de juiste actie.');
