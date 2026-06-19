"""
API REST BCV USD — https://github.com/alfredoiagarc/bcv-usd-api
"""

from datetime import datetime

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
