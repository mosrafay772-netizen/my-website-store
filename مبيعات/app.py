
from flask import Flask, render_template, request, redirect, session
import sqlite3

app = Flask(__name__)
app.secret_key = "secret123"

def connect():
    conn = sqlite3.connect("database.db")
    conn.row_factory = sqlite3.Row
    return conn

def create_tables():
    conn = connect()
    cur = conn.cursor()

    cur.execute('''
    CREATE TABLE IF NOT EXISTS products(
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        name TEXT,
        quantity INTEGER,
        price REAL
    )
    ''')

    cur.execute('''
    CREATE TABLE IF NOT EXISTS sales(
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        product_name TEXT,
        quantity INTEGER,
        total REAL
    )
    ''')

    conn.commit()
    conn.close()

create_tables()

@app.route("/", methods=["GET", "POST"])
def login():
    if request.method == "POST":
        username = request.form["username"]
        password = request.form["password"]

        if username == "admin" and password == "1234":
            session["user"] = username
            return redirect("/dashboard")

    return render_template("login.html")

@app.route("/dashboard")
def dashboard():
    if "user" not in session:
        return redirect("/")

    conn = connect()

    products = conn.execute("SELECT * FROM products").fetchall()
    sales = conn.execute("SELECT * FROM sales").fetchall()

    total_sales = sum([sale["total"] for sale in sales])

    conn.close()

    return render_template(
        "dashboard.html",
        products=products,
        sales=sales,
        total_sales=total_sales
    )

@app.route("/add_product", methods=["POST"])
def add_product():
    name = request.form["name"]
    quantity = request.form["quantity"]
    price = request.form["price"]

    conn = connect()
    conn.execute(
        "INSERT INTO products(name, quantity, price) VALUES(?,?,?)",
        (name, quantity, price)
    )
    conn.commit()
    conn.close()

    return redirect("/dashboard")

@app.route("/sell", methods=["POST"])
def sell():
    product_id = request.form["product_id"]
    qty = int(request.form["quantity"])

    conn = connect()
    product = conn.execute(
        "SELECT * FROM products WHERE id=?",
        (product_id,)
    ).fetchone()

    if product and product["quantity"] >= qty:

        new_qty = product["quantity"] - qty
        total = qty * product["price"]

        conn.execute(
            "UPDATE products SET quantity=? WHERE id=?",
            (new_qty, product_id)
        )

        conn.execute(
            "INSERT INTO sales(product_name, quantity, total) VALUES(?,?,?)",
            (product["name"], qty, total)
        )

        conn.commit()

    conn.close()

    return redirect("/dashboard")

@app.route("/delete/<int:id>")
def delete(id):
    conn = connect()
    conn.execute("DELETE FROM products WHERE id=?", (id,))
    conn.commit()
    conn.close()

    return redirect("/dashboard")

@app.route("/logout")
def logout():
    session.clear()
    return redirect("/")

if __name__ == "__main__":
    app.run(debug=True)
