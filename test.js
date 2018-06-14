let t1 = new Promise((resolve, reject) => {
    setTimeout(() => {
        resolve(4);
    }, 200);
}).then(data => {
    throw new Error();
}).then(() => console.log(5)).catch(error => console.log(error, 1));