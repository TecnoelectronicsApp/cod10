"""
Script para obtener el valor del USD desde el Banco Central de Venezuela (BCV)
Basado en: https://github.com/alfredoiagarc/bcv-usd-api
"""

import re
from datetime import datetime

import requests
import urllib3
from bs4 import BeautifulSoup

urllib3.disable_warnings(urllib3.exceptions.InsecureRequestWarning)


class BCVScraper:
    def __init__(self):
        self.url = 'https://www.bcv.org.ve'
        self.headers = {
            'User-Agent': (
                'Mozilla/5.0 (Windows NT 10.0; Win64; x64) '
                'AppleWebKit/537.36 (KHTML, like Gecko) '
                'Chrome/91.0.4472.124 Safari/537.36'
            )
        }

    def obtener_valor_usd(self):
        try:
            response = requests.get(
                self.url, headers=self.headers, timeout=10, verify=False
            )
            response.raise_for_status()
            soup = BeautifulSoup(response.content, 'html.parser')

            usd_value = None
            fecha = None

            dolar_div = soup.find('div', id='dolar')
            if dolar_div:
                strong_tag = dolar_div.find('strong')
                if strong_tag:
                    usd_value = strong_tag.get_text(strip=True)

            if not usd_value:
                oficial_section = soup.find(
                    'div', class_='view-tipo-de-cambio-oficial-del-bcv'
                )
                if oficial_section:
                    usd_elements = oficial_section.find_all(
                        string=re.compile(r'USD', re.IGNORECASE)
                    )
                    for elemento in usd_elements:
                        parent = elemento.parent
                        if parent:
                            container = parent.find_parent(
                                'div', class_='recuadrotsmc'
                            )
                            if container:
                                strong_tag = container.find('strong')
                                if strong_tag:
                                    usd_value = strong_tag.get_text(strip=True)
                                    break

            if not usd_value:
                elementos_usd = soup.find_all(
                    string=re.compile(r'USD', re.IGNORECASE)
                )
                for elemento in elementos_usd:
                    if elemento.find_parent('table'):
                        continue
                    parent = elemento.parent
                    if parent:
                        strong = parent.find_next('strong')
                        if strong:
                            texto = strong.get_text(strip=True)
                            if re.match(r'\d{2,3}[,\.]\d+', texto):
                                usd_value = texto
                                break

            fecha_elementos = soup.find_all(
                string=re.compile(r'Fecha|fecha', re.IGNORECASE)
            )
            for elemento in fecha_elementos:
                parent = elemento.parent
                if parent:
                    texto = parent.get_text()
                    match = re.search(
                        r'(\d{1,2})[/-](\d{1,2})[/-](\d{4})', texto
                    )
                    if match:
                        fecha = (
                            match.group(3)
                            + '-'
                            + match.group(2).zfill(2)
                            + '-'
                            + match.group(1).zfill(2)
                        )
                        break

            if not fecha:
                fecha = datetime.now().strftime('%Y-%m-%d')

            if usd_value:
                valor_limpio = usd_value.replace(',', '.')
                valor_float = float(valor_limpio)
                return {
                    'moneda': 'USD',
                    'valor': valor_float,
                    'valor_formateado': usd_value,
                    'fecha': fecha,
                    'exito': True
                }

            return {
                'exito': False,
                'error': 'No se pudo encontrar el valor del USD en la página'
            }
        except requests.exceptions.RequestException as e:
            return {'exito': False, 'error': 'Error al conectar con el BCV: ' + str(e)}
        except Exception as e:
            return {'exito': False, 'error': 'Error inesperado: ' + str(e)}

    def get_usd_value(self):
        resultado = self.obtener_valor_usd()
        if resultado['exito']:
            return resultado['valor']
        return None
