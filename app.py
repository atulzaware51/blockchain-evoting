from flask import Flask, request, jsonify, session
from flask_cors import CORS
import random, hashlib

app = Flask(__name__)
app.secret_key = "internship-secret"
CORS(app)

otp_store = {}
votes = []

@app.route("/send-otp", methods=["POST"])
def send_otp():
    email = request.json["email"]
    otp = random.randint(100000, 999999)
    otp_store[email] = otp
    print("OTP:", otp)
    return jsonify({"message": "OTP sent"})

@app.route("/verify-otp", methods=["POST"])
def verify_otp():
    email = request.json["email"]
    otp = int(request.json["otp"])
    if otp_store.get(email) == otp:
        session["user"] = email
        return jsonify({"success": True})
    return jsonify({"success": False}), 401

@app.route("/vote", methods=["POST"])
def vote():
    candidate = request.json["candidate"]
    vote_hash = hashlib.sha256(candidate.encode()).hexdigest()
    votes.append(vote_hash)
    return jsonify({"hash": vote_hash})

if __name__ == "__main__":
    app.run(host="0.0.0.0", port=5000, debug=True)
