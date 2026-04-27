import asyncio
import asyncpg

async def f():
    c = await asyncpg.connect('postgresql://rentsmart:rentsmart123@localhost:5432/rentsmart')
    result = await c.execute("UPDATE bookings SET status='cancelled' WHERE status='pending'")
    print('Done:', result)
    await c.close()

asyncio.run(f())