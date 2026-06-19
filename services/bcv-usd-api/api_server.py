"""
API REST BCV USD — https://github.com/alfredoiagarc/bcv-usd-api
"""

from datetime import datetime
from pathlib import Path
import json

import uvicorn
from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse

from bcv_scraper import BCVScraper

app = FastAPI(
    title='BCV USD API',
    description='Tipo de cambio USD desde el Banco Central de Venezuela',
    version='1.0.0'
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=['*'],
    allow_credentials=True,
    allow_methods=['*'],
    allow_headers=['*'],
)

scraper = BCVScraper()
CONFIG_FILE = Path(__file__).parent / 'store_config.json'

DEFAULT_STORE_CONFIG = {
    'paymentMethods': [
        {'id': 'efectivo', 'enabled': True, 'label': 'Efectivo'},
        {'id': 'punto_venta', 'enabled': True, 'label': 'Punto de venta'},
        {
            'id': 'pagomovil',
            'enabled': True,
            'label': 'Pagomóvil',
            'bankCode': '0102',
            'bankName': 'Banco de Venezuela',
            'phone': '',
            'ci': '',
        },
        {'id': 'binance', 'enabled': False, 'label': 'Binance', 'payId': ''},
    ]
}


def read_store_config():
    if CONFIG_FILE.exists():
        try:
            with open(CONFIG_FILE, 'r', encoding='utf-8') as f:
                return json.load(f)
        except Exception:
            pass
    return DEFAULT_STORE_CONFIG.copy()


def write_store_config(data):
    with open(CONFIG_FILE, 'w', encoding='utf-8') as f:
        json.dump(data, f, ensure_ascii=False, indent=2)


@app.get('/')
async def root():
    return {
        'mensaje': 'API del Banco Central de Venezuela',
        'version': '1.0.0',
        'endpoints': {
            '/usd': 'Obtener valor del USD',
            '/usd/simple': 'Obtener solo el valor numérico',
            '/health': 'Estado del servidor',
            '/docs': 'Documentación interactiva'
        }
    }


@app.get('/usd')
async def get_usd():
    try:
        resultado = scraper.obtener_valor_usd()
        if resultado['exito']:
            return JSONResponse(
                status_code=200,
                content={
                    'exito': True,
                    'moneda': resultado['moneda'],
                    'valor': resultado['valor'],
                    'valor_formateado': resultado['valor_formateado'],
                    'fecha': resultado['fecha'],
                    'timestamp': datetime.now().isoformat()
                }
            )
        raise HTTPException(status_code=500, detail=resultado['error'])
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(
            status_code=500,
            detail='Error al obtener el valor del USD: ' + str(e)
        )


@app.get('/usd/simple')
async def get_usd_simple():
    try:
        valor = scraper.get_usd_value()
        if valor is not None:
            return JSONResponse(status_code=200, content={'valor': valor})
        raise HTTPException(
            status_code=500, detail='No se pudo obtener el valor del USD'
        )
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(
            status_code=500,
            detail='Error al obtener el valor del USD: ' + str(e)
        )


@app.get('/store-config')
async def get_store_config():
    return JSONResponse(status_code=200, content=read_store_config())


@app.put('/store-config')
async def put_store_config(payload: dict):
    try:
        write_store_config(payload)
        return JSONResponse(status_code=200, content={'ok': True})
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@app.get('/health')
async def health_check():
    return {'status': 'ok', 'timestamp': datetime.now().isoformat()}


@app.get('/convert/{amount}')
async def convert_usd_to_bs(amount: float):
    try:
        resultado = scraper.obtener_valor_usd()
        if resultado['exito']:
            return JSONResponse(
                status_code=200,
                content={
                    'exito': True,
                    'usd': amount,
                    'bolivares': amount * resultado['valor'],
                    'tasa': resultado['valor'],
                    'fecha': resultado['fecha']
                }
            )
        raise HTTPException(status_code=500, detail=resultado['error'])
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(
            status_code=500, detail='Error al realizar la conversión: ' + str(e)
        )


if __name__ == '__main__':
    uvicorn.run(app, host='0.0.0.0', port=8000, log_level='info')
