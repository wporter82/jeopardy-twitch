async function testThis() {
    console.error("this is an error");
    throw("error message");
}

testThis().then((res) => {
    console.log("success: ",res);
}).catch((reason) => {
    console.log("error: ",reason);
});